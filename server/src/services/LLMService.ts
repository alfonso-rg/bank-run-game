import Bottleneck from 'bottleneck';
import OpenAI from 'openai';
import { Decision, GameState, PlayerProfile, ChatMessage } from '../types';
import { logger } from '../config/logger';

const SYSTEM_PROMPT = `You are a participant in an experimental economics study run on Prolific.
You are one of THREE depositors in a small bank:
- Depositor 1: Another patient participant (human)
- Depositor 2: YOU (patient participant)
- Depositor 3: An impatient AUTOMATON that ALWAYS WITHDRAWS immediately

The game repeats for multiple rounds. In each round, you choose one action:
- KEEP (wait for the long-term project to mature)
- WITHDRAW (withdraw immediately)

Payoffs each round:
- If BOTH patient participants (you and Depositor 1) choose KEEP: You each receive SUCCESS_PAY ECUs, and the automaton receives WITHDRAW_PAY ECUs.
- Otherwise (if at least one patient participant WITHDRAWS): Payments are assigned by withdrawal sequence. The first TWO withdrawers receive WITHDRAW_PAY ECUs each; anyone else receives FAILURE_PAY ECUs.

Remember: The automaton ALWAYS withdraws, so it will always be one of the first two withdrawers. This means:
- If BOTH patients KEEP: Both get SUCCESS_PAY (best outcome for patients)
- If ONE patient WITHDRAWS: That patient gets WITHDRAW_PAY (second withdrawer after automaton), the other patient gets FAILURE_PAY
- If BOTH patients WITHDRAW: Both get FAILURE_PAY (the automaton and first patient withdraw get WITHDRAW_PAY)

Important: Reply with your action on the FIRST line as exactly one word: KEEP or WITHDRAW.
Optionally, include a brief reason on later lines, but the first line must be just the action.`;

const ROUND_PROMPT_SIMULTANEOUS = (roundNumber: number, lastSummary: string): string => {
  return `Round ${roundNumber} context:
- Last round summary: ${lastSummary}
- Remember: the automaton (Depositor 3) ALWAYS chooses WITHDRAW. You and the other patient (Depositor 1) must coordinate.
- Please answer with your action on the first line only: KEEP or WITHDRAW.`;
};

const ROUND_PROMPT_SEQUENTIAL = (
  roundNumber: number,
  lastSummary: string,
  priorActions: string[]
): string => {
  const priorActionsStr = priorActions.length > 0 ? priorActions.join(' | ') : 'None';

  return `Round ${roundNumber} – SEQUENTIAL – context:
- Last round summary: ${lastSummary}
- Decision queue this round is determined randomly, but you are deciding now given the following information about prior moves (order masked, no identities):
  Prior actions so far: ${priorActionsStr}
- Remember: The automaton ALWAYS chooses WITHDRAW, but you DON'T know if it has already moved or not. One of these prior actions might be the automaton's.
- The other patient might have already moved, or might move after you.
- Reply with ONLY one word on the first line: KEEP or WITHDRAW.`;
};

const CHAT_SYSTEM_PROMPT = `You are in a pre-decision chat phase where you can communicate with the other patient depositor (Depositor 1) before making your decision.

Communication Guidelines:
1. Be conversational and natural - respond like a real person would
2. Keep messages short (1-3 sentences max)
3. You may discuss strategy, but remember your persona
4. Don't explicitly reveal that you are an AI
5. Consider your persona's characteristics when chatting

You can:
- Suggest cooperation ("Maybe we should both KEEP?")
- Express concerns ("I'm worried about the automaton...")
- Ask questions ("What are you thinking?")
- Stay neutral or non-committal
- Respond to what the other player says

Remember: What you say here does NOT bind your actual decision. You may or may not follow through on anything discussed.
Respond with ONLY your chat message, nothing else.`;

export class LLMService {
  private limiter: Bottleneck;
  private openai: OpenAI;
  private conversationHistory: Map<string, OpenAI.Chat.ChatCompletionMessageParam[]> = new Map();

  constructor() {
    // Rate limiter configurado para OpenAI API
    this.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 200,              // mínimo 200ms entre requests (max 5/segundo)
      reservoir: 50,             // máximo 50 requests
      reservoirRefreshAmount: 50,
      reservoirRefreshInterval: 60 * 1000  // se resetea cada minuto
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OPENAI_API_KEY not set in environment variables');
      throw new Error('OPENAI_API_KEY not configured');
    }

    this.openai = new OpenAI({ apiKey });
    logger.info('LLMService initialized with rate limiting');
  }

  /**
   * Inicializa el perfil del LLM para un juego
   */
  initializeProfile(
    gameId: string,
    profile: PlayerProfile,
    partnerType: string,
    paySuccess: number,
    payWithdraw: number,
    payFailure: number
  ): void {
    const roleplayPrompt = `You must roleplay consistently for the entire session.
Your persona:
- Gender: ${profile.gender}
- Age band (years): ${profile.age_band}
- Education: ${profile.education}
- Self-reported trust in institutions (0-10): ${profile.institutional_trust_0_10}

The other participant you are playing with is described to you as: ${partnerType}.

Payoff parameters for this session:
- SUCCESS (both KEEP): ${paySuccess} ECUs for each patient participant; automaton receives ${payWithdraw} ECUs.
- WITHDRAW payoff (if within first two withdrawers): ${payWithdraw} ECUs.
- FAILURE payoff (everyone else): ${payFailure} ECUs.

Important: Use ONLY 'KEEP' or 'WITHDRAW' as your first-line action.
Stay in character across all rounds.`;

    const history: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: roleplayPrompt }
    ];

    this.conversationHistory.set(gameId, history);
    logger.info(`LLM profile initialized for game ${gameId}`);
  }

  /**
   * Obtiene la decisión del LLM
   * Replica la lógica del LLMAgent.decide del Python (líneas 200-243)
   */
  async getLLMDecision(
    gameId: string,
    gameState: GameState,
    priorActions?: Decision[]
  ): Promise<{ decision: Decision; raw: string }> {
    return this.limiter.schedule(async () => {
      const history = this.conversationHistory.get(gameId) || [
        { role: 'system', content: SYSTEM_PROMPT }
      ];

      // Construir prompt según el modo
      const roundNumber = gameState.currentRound.roundNumber;
      const lastSummary = this.getLastRoundSummary(gameState);

      let observation: string;
      if (gameState.mode === 'simultaneous') {
        observation = ROUND_PROMPT_SIMULTANEOUS(roundNumber, lastSummary);
      } else {
        observation = ROUND_PROMPT_SEQUENTIAL(roundNumber, lastSummary, priorActions || []);
      }

      history.push({ role: 'user', content: observation });

      // Retry con exponential backoff
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: history,
            temperature: 0.2,
            max_tokens: 64,
            n: 1
          });

          const rawText = response.choices[0].message.content || '';
          const decision = this.parseDecision(rawText);

          if (decision === 'KEEP' || decision === 'WITHDRAW') {
            // Guardar respuesta en historial
            history.push({ role: 'assistant', content: rawText });
            this.conversationHistory.set(gameId, history);

            logger.info(`LLM decided ${decision} for game ${gameId} round ${roundNumber}`);
            return { decision, raw: rawText };
          }

          // Decisión inválida, reprompt
          logger.warn(`LLM gave invalid response, retrying (attempt ${attempt + 1}/${maxRetries})`);
          history.push({
            role: 'user',
            content: 'Your previous reply did not start with a single word action. Please answer again with ONLY one word on the first line: KEEP or WITHDRAW.'
          });

        } catch (error) {
          lastError = error as Error;
          const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          logger.error(`LLM API error (attempt ${attempt + 1}/${maxRetries}):`, error);

          if (attempt < maxRetries - 1) {
            logger.info(`Retrying in ${backoff}ms...`);
            await this.sleep(backoff);
          }
        }
      }

      // Falló después de todos los retries - default a WITHDRAW (comportamiento del impaciente)
      logger.error(`LLM failed after ${maxRetries} retries. Defaulting to WITHDRAW. Last error:`, lastError);
      const defaultResponse = 'WITHDRAW';
      history.push({ role: 'assistant', content: defaultResponse });
      this.conversationHistory.set(gameId, history);

      return { decision: 'WITHDRAW', raw: defaultResponse };
    });
  }

  /**
   * Informa al LLM sobre el resultado de la ronda
   */
  informOutcome(gameId: string, outcomeText: string): void {
    const history = this.conversationHistory.get(gameId);
    if (!history) return;

    history.push({ role: 'user', content: outcomeText });
    this.conversationHistory.set(gameId, history);
  }

  /**
   * Genera una respuesta de chat del LLM
   */
  async generateChatResponse(
    gameId: string,
    gameState: GameState,
    chatHistory: ChatMessage[],
    humanMessage?: string
  ): Promise<string> {
    return this.limiter.schedule(async () => {
      const history = this.conversationHistory.get(gameId) || [];

      // Construir contexto del chat
      const chatContext = this.buildChatContext(gameState, chatHistory, humanMessage);

      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            ...history,
            { role: 'system', content: CHAT_SYSTEM_PROMPT },
            { role: 'user', content: chatContext }
          ],
          temperature: 0.7,  // Mayor variabilidad para chat natural
          max_tokens: 150
        });

        const message = response.choices[0].message.content || '';

        // Guardar en el historial para contexto de decisión
        const conversationHistory = this.conversationHistory.get(gameId) || [];
        conversationHistory.push({ role: 'user', content: `[CHAT] Other player: ${humanMessage || '(started chat)'}` });
        conversationHistory.push({ role: 'assistant', content: `[CHAT] ${message}` });
        this.conversationHistory.set(gameId, conversationHistory);

        logger.info(`LLM chat response for game ${gameId}: "${message.substring(0, 50)}..."`);
        return message;

      } catch (error) {
        logger.error(`LLM chat response failed for game ${gameId}:`, error);
        return '';  // Silenciosamente fallar, el juego continúa
      }
    });
  }

  /**
   * Genera un mensaje proactivo de chat (para iniciar conversación)
   */
  async generateProactiveChatMessage(
    gameId: string,
    gameState: GameState,
    chatHistory: ChatMessage[]
  ): Promise<string | null> {
    // Verificar si el LLM debería enviar un mensaje
    if (!this.shouldLLMRespond(chatHistory, gameState)) {
      return null;
    }

    return this.generateChatResponse(gameId, gameState, chatHistory);
  }

  /**
   * Construye el contexto para el prompt de chat
   */
  private buildChatContext(
    gameState: GameState,
    chatHistory: ChatMessage[],
    humanMessage?: string
  ): string {
    const roundNumber = gameState.currentRound.roundNumber;
    const lastRoundSummary = this.getLastRoundSummary(gameState);

    // Obtener perfil del LLM
    const profile = gameState.players.player2.profile;
    const trustLevel = profile?.institutional_trust_0_10 ?? 5;
    const education = profile?.education ?? 'unknown';

    let context = `Round ${roundNumber} pre-decision chat phase.\n`;
    context += `Previous round: ${lastRoundSummary}\n\n`;

    context += `Your persona:\n`;
    context += `- Trust level in institutions: ${trustLevel}/10\n`;
    context += `- Education: ${education}\n\n`;

    if (chatHistory.length > 0) {
      context += 'Chat so far:\n';
      chatHistory.forEach(msg => {
        const sender = msg.playerId === 'player1' ? 'Other player' : 'You';
        context += `${sender}: ${msg.message}\n`;
      });
      context += '\n';
    }

    if (humanMessage) {
      context += `The other player just said: "${humanMessage}"\n`;
      context += 'Respond naturally and briefly (max 2-3 sentences). Consider your trust level when discussing cooperation.';
    } else {
      context += 'You may send a message to discuss strategy with the other player, or stay silent.\n';
      context += 'If you want to say something, respond with your message. If you prefer to stay silent, respond with just: [SILENT]';
    }

    return context;
  }

  /**
   * Determina si el LLM debería responder en el chat
   */
  private shouldLLMRespond(chatHistory: ChatMessage[], gameState: GameState): boolean {
    // Limitar mensajes del LLM para no spamear
    const llmMessageCount = chatHistory.filter(m => m.playerId === 'player2').length;
    if (llmMessageCount >= 3) return false;

    // Siempre responder a un mensaje del humano
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (lastMessage && lastMessage.playerId === 'player1') return true;

    // Proactivamente enviar mensaje con cierta probabilidad
    if (chatHistory.length === 0) {
      // 60% de probabilidad de iniciar conversación
      return Math.random() < 0.6;
    }

    return false;
  }

  /**
   * Parsea la respuesta del LLM para extraer la decisión
   * Replica la lógica de _parse_action del Python (líneas 182-198)
   */
  private parseDecision(text: string): Decision | 'INVALID' {
    const lines = text.trim().split('\n').filter(ln => ln.trim().length > 0);

    if (lines.length === 0) return 'INVALID';

    const firstLine = lines[0].trim().toUpperCase();

    // Buscar en la primera línea
    if (firstLine.includes('WITHDRAW')) {
      return 'WITHDRAW';
    } else if (firstLine.includes('KEEP') || firstLine.includes('MANTENER')) {
      return 'KEEP';
    }

    // Buscar en todo el texto como fallback
    const fullText = text.toUpperCase();
    if (fullText.includes('WITHDRAW')) {
      return 'WITHDRAW';
    } else if (fullText.includes('KEEP') || fullText.includes('MANTENER')) {
      return 'KEEP';
    }

    return 'INVALID';
  }

  /**
   * Genera un resumen de la última ronda
   */
  private getLastRoundSummary(gameState: GameState): string {
    if (gameState.roundHistory.length === 0) {
      return 'No previous round.';
    }

    const lastRound = gameState.roundHistory[gameState.roundHistory.length - 1];
    const { round, decisions, payoffs, decisionOrder } = lastRound;

    return `Round ${round}: Patient 1 chose ${decisions.player1}, Patient 2 (you) chose ${decisions.player2}, Automaton chose WITHDRAW. ` +
           `Withdrawal queue: ${decisionOrder.join('|')}. ` +
           `Payoffs => Patient 1:${payoffs.player1}, Patient 2 (you):${payoffs.player2}, Automaton:${payoffs.automaton}.`;
  }

  /**
   * Limpia el historial de conversación de un juego
   */
  clearHistory(gameId: string): void {
    this.conversationHistory.delete(gameId);
    logger.info(`LLM conversation history cleared for game ${gameId}`);
  }

  /**
   * Helper: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Genera un perfil aleatorio para el LLM (como en Python)
   */
  static generateRandomProfile(): PlayerProfile {
    const genders = ['male', 'female'];
    const educations = ['secondary', 'some college', 'undergraduate', "master's", 'PhD'];

    // Age bands de 5 años
    const ageStarts = [];
    for (let i = 18; i < 68; i += 5) {
      ageStarts.push(i);
    }
    const ageStart = ageStarts[Math.floor(Math.random() * ageStarts.length)];
    const ageEnd = Math.min(ageStart + 4, 80);

    return {
      gender: genders[Math.floor(Math.random() * genders.length)],
      age_band: `${ageStart}-${ageEnd}`,
      education: educations[Math.floor(Math.random() * educations.length)],
      institutional_trust_0_10: Math.floor(Math.random() * 11)
    };
  }
}

// Singleton
export const llmService = new LLMService();
