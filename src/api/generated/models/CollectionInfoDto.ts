/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CollectionInfoDto = {
    /**
     * Full collection id, "<NAME>-ak_<deployer>"
     */
    id: string;
    /**
     * Human-readable collection name (badge label)
     */
    name: string;
    description?: string | null;
    /**
     * Max token name length allowed in this collection
     */
    allowed_name_length: string;
};

