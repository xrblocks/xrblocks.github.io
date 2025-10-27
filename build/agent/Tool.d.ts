import * as GoogleGenAITypes from '@google/genai';
export interface ToolCall {
    name: string;
    args: unknown;
}
/**
 * Standardized result type for tool execution.
 * @typeParam T - The type of data returned on success.
 */
export interface ToolResult<T = unknown> {
    /** Whether the tool execution succeeded */
    success: boolean;
    /** The result data if successful */
    data?: T;
    /** Error message if execution failed */
    error?: string;
    /** Additional metadata about the execution */
    metadata?: Record<string, unknown>;
}
export type ToolSchema = Omit<GoogleGenAITypes.Schema, 'type' | 'properties'> & {
    properties?: Record<string, ToolSchema>;
    type?: keyof typeof GoogleGenAITypes.Type;
};
export type ToolOptions = {
    /** The name of the tool. */
    name: string;
    /** A description of what the tool does. */
    description: string;
    /** The parameters of the tool */
    parameters?: ToolSchema;
    /** A callback to execute when the tool is triggered */
    onTriggered?: (args: unknown) => unknown | Promise<unknown>;
    behavior?: 'BLOCKING' | 'NON_BLOCKING' | GoogleGenAITypes.Behavior;
};
/**
 * A base class for tools that the agent can use.
 */
export declare class Tool {
    name: string;
    description?: string;
    parameters?: ToolSchema;
    onTriggered?: (args: unknown) => unknown;
    behavior?: 'BLOCKING' | 'NON_BLOCKING';
    /**
     * @param options - The options for the tool.
     */
    constructor(options: ToolOptions);
    /**
     * Executes the tool's action with standardized error handling.
     * @param args - The arguments for the tool.
     * @returns A promise that resolves with a ToolResult containing success/error information.
     */
    execute(args: unknown): Promise<ToolResult>;
    /**
     * Returns a JSON representation of the tool.
     * @returns A valid FunctionDeclaration object.
     */
    toJSON(): GoogleGenAITypes.FunctionDeclaration;
}
