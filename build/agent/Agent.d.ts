import { AI } from '../ai/AI';
import { Context } from './Context';
import { Memory } from './Memory';
import { Tool } from './Tool';
/**
 * Lifecycle callbacks for agent events.
 */
export interface AgentLifecycleCallbacks {
    /** Called when a session starts */
    onSessionStart?: () => void | Promise<void>;
    /** Called when a session ends */
    onSessionEnd?: () => void | Promise<void>;
    /** Called after a tool is executed */
    onToolExecuted?: (toolName: string, result: unknown) => void;
    /** Called when an error occurs */
    onError?: (error: Error) => void;
}
/**
 * An agent that can use an AI to reason and execute tools.
 */
export declare class Agent {
    static dependencies: {};
    ai: AI;
    tools: Tool[];
    memory: Memory;
    contextBuilder: Context;
    lifecycleCallbacks?: AgentLifecycleCallbacks;
    isSessionActive: boolean;
    constructor(ai: AI, tools?: Tool[], instruction?: string, callbacks?: AgentLifecycleCallbacks);
    /**
     * Starts the agent's reasoning loop with an initial prompt.
     * @param prompt - The initial prompt from the user.
     * @returns The final text response from the agent.
     */
    start(prompt: string): Promise<string>;
    /**
     * The main reasoning and action loop of the agent for non-live mode.
     * It repeatedly builds context, queries the AI, and executes tools
     * until a final text response is generated.
     */
    private run;
    findTool(name: string): Tool | undefined;
    /**
     * Get the current session state.
     * @returns Object containing session information
     */
    getSessionState(): {
        isActive: boolean;
        toolCount: number;
        memorySize: number;
    };
}
