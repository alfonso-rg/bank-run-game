import Bottleneck from 'bottleneck';
import OpenAI from 'openai';
import { Decision, GameState, PlayerProfile } from '../types';
import { logger } from '../config/logger';

const SYSTEM_PROMPT = `You are a participant in an experimental economics study run on Prolific.
You are one of three depositors in a small bank. One is an impatient automaton that ALWAYS WITHDRAWS; the other two depositors are human-like agents (you and another participant).

The game repeats for multiple rounds. In each round, choose one action:
- KEEP
- WITHDRAW

Payoffs each round:
- If BOTH patient participants choose KEEP, they both receive SUCCESS_PAY ECUs each, and the impatient automaton receives WITHDRAW_PAY ECUs.
- Otherwise (if at least one participant WITHDRAWS), payments are assigned by the withdrawal sequence: the first two WITHDRAWERS receive WITHDRAW_PAY ECUs each; anyone else receives FAILURE_PAY ECUs.

Important: Reply with your action on the FIRST line as exactly one word: KEEP or WITHDRAW.
Optionally, include a brief reason on later lines, but the first line must be just the action.`;

const ROUND_PROMPT_SIMULTANEOUS = (roundNumber: number, lastSummary: string): string => {
  return `Round ${roundNumber} context:
- Last round summary: ${lastSummary}
- Remember: the impatient automaton ALWAYS chooses WITHDRAW.
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
- Decision queue this round is secret to participants, but you are deciding now given the following information about prior moves this round (order masked, no identities):
  Prior actions so far: ${priorActionsStr}
- Remember: exactly one automaton exists and it ALWAYS chooses WITHDRAW (you are NOT told if it already moved).
- Reply with ONLY one word on the first line: KEEP or WITHDRAW.`;
};

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

    return `Round ${round}: Player1 chose ${decisions.player1}, Player2 chose ${decisions.player2}, Auto chose WITHDRAW. ` +
           `Withdrawal queue: ${decisionOrder.join('|')}. ` +
           `Payoffs => Player1:${payoffs.player1}, Player2:${payoffs.player2}, Auto:${payoffs.llm}.`;
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
