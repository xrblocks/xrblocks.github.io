import type { SimulatorCustomInstruction } from 'xrblocks';
import { SimulatorInstructionsCard } from './SimulatorInstructionsCard.js';
export declare class CustomInstruction extends SimulatorInstructionsCard {
    customInstruction: SimulatorCustomInstruction;
    getHeaderContents(): import("lit-html").TemplateResult<1>;
    getImageContents(): import("lit-html").TemplateResult<1>;
    getDescriptionContents(): import("lit-html").TemplateResult<1>;
    render(): import("lit-html").TemplateResult<1>;
}
