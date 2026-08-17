/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PreferenceUpdateItem } from './PreferenceUpdateItem';
export type UpdatePreferencesDto = {
    /**
     * Nonce returned by POST /notifications/preferences/challenge
     */
    nonce: string;
    /**
     * Signature of the challenge message (sg_... or hex)
     */
    signature: string;
    /**
     * Partial update — only types listed here are upserted; others keep their state.
     */
    preferences: Array<PreferenceUpdateItem>;
};

