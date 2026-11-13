export interface paths {
    "/api/v1/api-tokens/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["ApiTokens_revoke"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Auth_register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/change-requests/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Changes_detail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["Changes_patch"];
        trace?: never;
    };
    "/api/v1/change-requests/{id}/client-decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Changes_client"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/change-requests/{id}/deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Deliveries_history"];
        put?: never;
        post: operations["Deliveries_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/change-requests/{id}/resubmit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Changes_reopen"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/change-requests/{id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Changes_submit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/change-requests/{id}/vendor-decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Changes_vendor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/change-requests/{id}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Changes_versionDetail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Dashboard_read"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/deliveries/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Deliveries_detail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/deliveries/{id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Deliveries_review"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Auth_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Projects_list"];
        put?: never;
        post: operations["Projects_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Projects_detail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/api-tokens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ApiTokens_list"];
        put?: never;
        post: operations["ApiTokens_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/approved-specs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ApprovedSpecs_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/approved-specs/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ApprovedSpecs_detail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/audit-events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AuditRead_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/change-requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Changes_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/client": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Projects_client"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/copilot/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Copilot_message"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Deliveries_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Projects_add"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{id}/requirements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Requirements_list"];
        put?: never;
        post: operations["Requirements_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{projectId}/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Documents_list"];
        put?: never;
        post: operations["Documents_upload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{projectId}/documents/{documentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["Documents_update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{projectId}/documents/{documentId}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Documents_read"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Requirements_detail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["Requirements_patch"];
        trace?: never;
    };
    "/api/v1/requirements/{id}/ai-analysis": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Ai_analyze"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/ai-assistance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Ai_assist"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/change-requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Changes_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/clarifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Requirements_clarify"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/copilot-proposals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Proposals_list"];
        put?: never;
        post: operations["Proposals_prepare"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/copilot-proposals/{proposalId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Proposals_read"];
        put: operations["Proposals_edit"];
        post?: never;
        delete: operations["Proposals_remove"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/copilot-proposals/{proposalId}/execute": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Proposals_execute"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/mark-ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Requirements_ready"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/revisions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Requirements_history"];
        put?: never;
        post: operations["Requirements_revision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/revisions/{revisionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Requirements_revisionDetail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/working-draft-publications/{operationId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["WorkingDrafts_receipt"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/working-drafts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["WorkingDrafts_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/working-drafts/{kind}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["WorkingDrafts_save"];
        post?: never;
        delete: operations["WorkingDrafts_remove"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/requirements/{id}/working-drafts/{kind}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["WorkingDrafts_publish"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workspaces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Workspaces_list"];
        put?: never;
        post: operations["Workspaces_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workspaces/{id}/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["Workspaces_members"];
        put?: never;
        post: operations["Workspaces_add"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AuditEvent: {
            actor: {
                displayName: string;
                /** Format: uuid */
                userId: string;
            } | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            entityId: string;
            /** @enum {string} */
            entityType: "project" | "requirement" | "clarification" | "requirement_revision" | "change_request" | "delivery" | "api_token";
            entityVersion: number | null;
            /** @enum {string} */
            eventType: "api_token.created" | "api_token.revoked" | "api_token.used" | "project.created" | "project.developer_added" | "project.client_bound" | "project.client_replaced" | "requirement.created" | "requirement.draft_updated" | "clarification.question_added" | "clarification.answer_added" | "requirement.revision_created" | "requirement.marked_ready" | "change_request.created" | "change_request.draft_updated" | "change_request.reopened" | "change_request.submitted" | "change_request.vendor_decided" | "change_request.client_decided" | "delivery.submitted" | "delivery.reviewed";
            /** Format: uuid */
            id: string;
            metadata: {
                /** Format: uuid */
                approvalId?: string;
                /** Format: uuid */
                changeRequestId?: string;
                /** Format: uuid */
                changeRequestVersionId?: string;
                /** @enum {string} */
                decision?: "APPROVED" | "REJECTED" | "ACCEPTED" | "CHANGES_REQUESTED";
                draftVersion?: number;
                expiresInDays?: number;
                fields?: ("title" | "originalText" | "requirementRevisionId" | "scopeSummary" | "estimateHours" | "costDeltaMinor" | "currency" | "scheduleDeltaDays" | "acceptanceCriteria")[];
                /** @enum {string} */
                fromStatus?: "DRAFT" | "CLARIFYING" | "READY" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED" | "ACCEPTED" | "CHANGES_REQUESTED";
                /** @enum {string} */
                operation?: "approved_spec.list" | "approved_spec.detail";
                /** Format: uuid */
                parentId?: string;
                /** Format: uuid */
                previousVersionId?: string;
                /** @enum {string} */
                principalType?: "project_token";
                /** Format: uuid */
                requirementId?: string;
                resultCount?: number;
                /** Format: uuid */
                reviewId?: string;
                /** Format: uuid */
                revisionId?: string;
                /** @enum {string} */
                role?: "DEVELOPER";
                /** @enum {string} */
                scope?: "approved_specs:read";
                /** @enum {string} */
                step?: "VENDOR" | "CLIENT";
                /** @enum {string} */
                toStatus?: "DRAFT" | "CLARIFYING" | "READY" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED" | "ACCEPTED" | "CHANGES_REQUESTED";
                /** Format: uuid */
                versionId?: string;
                versionNo?: number;
            };
            /** Format: uuid */
            projectId: string;
            target: {
                /** @enum {string} */
                kind: "project";
                /** Format: uuid */
                projectId: string;
            } | {
                /** Format: uuid */
                clarificationId?: string;
                /** @enum {string} */
                kind: "requirement";
                /** Format: uuid */
                projectId: string;
                /** Format: uuid */
                requirementId: string;
            } | {
                /** @enum {string} */
                kind: "revision";
                /** Format: uuid */
                projectId: string;
                /** Format: uuid */
                requirementId: string;
                /** Format: uuid */
                revisionId: string;
            } | {
                /** Format: uuid */
                changeRequestId: string;
                /** @enum {string} */
                kind: "change";
                /** Format: uuid */
                projectId: string;
                /** Format: uuid */
                versionId?: string;
            } | {
                /** Format: uuid */
                deliveryId: string;
                /** @enum {string} */
                kind: "delivery";
                /** Format: uuid */
                projectId: string;
            } | {
                /** @enum {string} */
                kind: "api_tokens";
                /** Format: uuid */
                projectId: string;
            } | (never | null);
        };
        ChangeDecision: {
            approval: {
                /** Format: uuid */
                actorId: string;
                /** Format: uuid */
                changeRequestVersionId: string;
                comment: string | null;
                /** Format: date-time */
                createdAt: string;
                /** @enum {string} */
                decision: "APPROVED" | "REJECTED";
                /** Format: uuid */
                id: string;
                /** @enum {string} */
                step: "VENDOR" | "CLIENT";
            };
            /** Format: uuid */
            approvedVersionId?: string;
            /** Format: uuid */
            changeRequestId: string;
            /** Format: uuid */
            changeRequestVersionId: string;
            lockVersion: number;
            /** @enum {string} */
            status: "DRAFT" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED";
        };
        ChangeDetail: {
            activeVersion: {
                acceptanceCriteria: string[];
                approvals: {
                    /** Format: uuid */
                    actorId: string;
                    /** Format: uuid */
                    changeRequestVersionId: string;
                    comment: string | null;
                    /** Format: date-time */
                    createdAt: string;
                    /** @enum {string} */
                    decision: "APPROVED" | "REJECTED";
                    /** Format: uuid */
                    id: string;
                    /** @enum {string} */
                    step: "VENDOR" | "CLIENT";
                }[];
                /** Format: uuid */
                changeRequestId: string;
                costDeltaMinor: number;
                currency: string;
                estimateHours: string;
                /** Format: uuid */
                id: string;
                requirementRevision: {
                    acceptanceCriteria: string[];
                    content: string;
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    createdBy: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    requirementId: string;
                    revisionNo: number;
                };
                /** Format: uuid */
                requirementRevisionId: string;
                scheduleDeltaDays: number;
                scopeSnapshot: string;
                /** Format: date-time */
                submittedAt: string;
                /** Format: uuid */
                submittedBy: string;
                versionNo: number;
            } | null;
            /** Format: uuid */
            activeVersionId: string | null;
            capabilities: {
                clientDecision: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                createDelivery: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                editDraft: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                reopen: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                submit: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                vendorDecision: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
            };
            /** Format: date-time */
            createdAt: string;
            draft: {
                acceptanceCriteria: string[] | null;
                costDeltaMinor: number | null;
                currency: string | null;
                estimateHours: string | null;
                /** Format: uuid */
                requirementRevisionId: string;
                scheduleDeltaDays: number | null;
                scopeSummary: string | null;
            };
            /** Format: uuid */
            id: string;
            lockVersion: number;
            /** Format: uuid */
            projectId: string;
            /** Format: uuid */
            requirementId: string;
            /** @enum {string} */
            status: "DRAFT" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED";
            /** Format: date-time */
            updatedAt: string;
            versions: {
                acceptanceCriteria: string[];
                approvals: {
                    /** Format: uuid */
                    actorId: string;
                    /** Format: uuid */
                    changeRequestVersionId: string;
                    comment: string | null;
                    /** Format: date-time */
                    createdAt: string;
                    /** @enum {string} */
                    decision: "APPROVED" | "REJECTED";
                    /** Format: uuid */
                    id: string;
                    /** @enum {string} */
                    step: "VENDOR" | "CLIENT";
                }[];
                /** Format: uuid */
                changeRequestId: string;
                costDeltaMinor: number;
                currency: string;
                estimateHours: string;
                /** Format: uuid */
                id: string;
                requirementRevision: {
                    acceptanceCriteria: string[];
                    content: string;
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    createdBy: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    requirementId: string;
                    revisionNo: number;
                };
                /** Format: uuid */
                requirementRevisionId: string;
                scheduleDeltaDays: number;
                scopeSnapshot: string;
                /** Format: date-time */
                submittedAt: string;
                /** Format: uuid */
                submittedBy: string;
                versionNo: number;
            }[];
        } | {
            activeVersion: {
                acceptanceCriteria: string[];
                approvals: {
                    /** Format: uuid */
                    actorId: string;
                    /** Format: uuid */
                    changeRequestVersionId: string;
                    comment: string | null;
                    /** Format: date-time */
                    createdAt: string;
                    /** @enum {string} */
                    decision: "APPROVED" | "REJECTED";
                    /** Format: uuid */
                    id: string;
                    /** @enum {string} */
                    step: "VENDOR" | "CLIENT";
                }[];
                /** Format: uuid */
                changeRequestId: string;
                costDeltaMinor: number;
                currency: string;
                estimateHours: string;
                /** Format: uuid */
                id: string;
                requirementRevision: {
                    acceptanceCriteria: string[];
                    content: string;
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    createdBy: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    requirementId: string;
                    revisionNo: number;
                };
                /** Format: uuid */
                requirementRevisionId: string;
                scheduleDeltaDays: number;
                scopeSnapshot: string;
                /** Format: date-time */
                submittedAt: string;
                /** Format: uuid */
                submittedBy: string;
                versionNo: number;
            } | null;
            /** Format: uuid */
            activeVersionId: string | null;
            capabilities: {
                clientDecision: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                createDelivery: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                editDraft: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                reopen: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                submit: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                vendorDecision: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
            };
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            lockVersion: number;
            /** Format: uuid */
            projectId: string;
            /** Format: uuid */
            requirementId: string;
            /** @enum {string} */
            status: "DRAFT" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED";
            /** Format: date-time */
            updatedAt: string;
            versions: {
                acceptanceCriteria: string[];
                approvals: {
                    /** Format: uuid */
                    actorId: string;
                    /** Format: uuid */
                    changeRequestVersionId: string;
                    comment: string | null;
                    /** Format: date-time */
                    createdAt: string;
                    /** @enum {string} */
                    decision: "APPROVED" | "REJECTED";
                    /** Format: uuid */
                    id: string;
                    /** @enum {string} */
                    step: "VENDOR" | "CLIENT";
                }[];
                /** Format: uuid */
                changeRequestId: string;
                costDeltaMinor: number;
                currency: string;
                estimateHours: string;
                /** Format: uuid */
                id: string;
                requirementRevision: {
                    acceptanceCriteria: string[];
                    content: string;
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    createdBy: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    requirementId: string;
                    revisionNo: number;
                };
                /** Format: uuid */
                requirementRevisionId: string;
                scheduleDeltaDays: number;
                scopeSnapshot: string;
                /** Format: date-time */
                submittedAt: string;
                /** Format: uuid */
                submittedBy: string;
                versionNo: number;
            }[];
        };
        ChangeDraft: {
            /** Format: uuid */
            activeVersionId: string | null;
            /** Format: date-time */
            createdAt: string;
            draft: {
                acceptanceCriteria: string[] | null;
                costDeltaMinor: number | null;
                currency: string | null;
                estimateHours: string | null;
                /** Format: uuid */
                requirementRevisionId: string;
                scheduleDeltaDays: number | null;
                scopeSummary: string | null;
            };
            /** Format: uuid */
            id: string;
            lockVersion: number;
            /** Format: uuid */
            projectId: string;
            /** Format: uuid */
            requirementId: string;
            /** @enum {string} */
            status: "DRAFT" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED";
            /** Format: date-time */
            updatedAt: string;
        };
        ChangeListItem: {
            /** Format: uuid */
            activeVersionId: string | null;
            activeVersionNo: number | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            lockVersion: number;
            /** Format: uuid */
            projectId: string;
            /** Format: uuid */
            requirementId: string;
            requirementTitle: string;
            /** @enum {string} */
            status: "DRAFT" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED";
            /** Format: date-time */
            updatedAt: string;
        };
        ChangeSummary: {
            /** Format: uuid */
            activeVersionId: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            lockVersion: number;
            /** Format: uuid */
            projectId: string;
            /** Format: uuid */
            requirementId: string;
            /** @enum {string} */
            status: "DRAFT" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED";
            /** Format: date-time */
            updatedAt: string;
        };
        ClarificationCreated: {
            /** Format: uuid */
            authorId: string;
            body: string;
            /** Format: date-time */
            createdAt: string;
            draftVersion: number;
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            kind: "QUESTION" | "ANSWER";
            /** Format: uuid */
            latestRevisionId: string | null;
            /** Format: uuid */
            parentId: string | null;
            /** Format: uuid */
            requirementId: string;
            /** @enum {string} */
            status: "DRAFT" | "CLARIFYING" | "READY";
        };
        Dashboard: {
            items: {
                /** @enum {string} */
                action: "OPEN_PROJECT" | "OPEN_REQUIREMENT" | "OPEN_CHANGE" | "OPEN_DELIVERY";
                /** @enum {string} */
                bucket: "mine" | "waiting" | "completed";
                /** Format: uuid */
                changeRequestId: string | null;
                /** Format: uuid */
                changeRequestVersionId: string | null;
                deliveryNo: number | null;
                /** Format: uuid */
                entityId: string;
                /** @enum {string} */
                entityType: "project" | "requirement" | "change_request" | "delivery";
                key: string;
                /** Format: date-time */
                occurredAt: string;
                /** Format: uuid */
                projectId: string;
                projectName: string;
                /** @enum {string} */
                projectRole: "OWNER" | "DEVELOPER" | "CLIENT";
                /** Format: uuid */
                requirementId: string | null;
                title: string;
                /** @enum {string} */
                type: "BIND_CLIENT" | "CLARIFY_REQUIREMENT" | "PREPARE_REVISION" | "MARK_READY" | "PREPARE_ASSESSMENT" | "COMPLETE_ASSESSMENT" | "REVISE_ASSESSMENT" | "VENDOR_APPROVAL" | "CLIENT_APPROVAL" | "SUBMIT_DELIVERY" | "REVISE_DELIVERY" | "REVIEW_DELIVERY" | "ACCEPTED_DELIVERY";
                versionNo: number | null;
            }[];
            scope: {
                /** Format: uuid */
                projectId: string | null;
                /** Format: uuid */
                workspaceId: string | null;
            };
            summary: {
                buckets: {
                    completed: number;
                    mine: number;
                    waiting: number;
                };
                changeCounts: {
                    APPROVED: number;
                    DRAFT: number;
                    REJECTED: number;
                    SUBMITTED: number;
                    VENDOR_APPROVED: number;
                };
                deliveryCounts: {
                    ACCEPTED: number;
                    CHANGES_REQUESTED: number;
                    SUBMITTED: number;
                };
                projectCount: number;
                requirementCounts: {
                    CLARIFYING: number;
                    DRAFT: number;
                    READY: number;
                };
            };
        };
        Delivery: {
            artifactUrl: string;
            /** Format: uuid */
            changeRequestId: string;
            /** Format: uuid */
            changeRequestVersionId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            deliveryNo: number;
            evidenceLinks: string[];
            /** Format: uuid */
            id: string;
            review: {
                comment: string | null;
                /** Format: date-time */
                createdAt: string;
                /** @enum {string} */
                decision: "ACCEPTED" | "CHANGES_REQUESTED";
                /** Format: uuid */
                deliveryId: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                reviewerId: string;
            } | null;
            /** @enum {string} */
            status: "SUBMITTED" | "CHANGES_REQUESTED" | "ACCEPTED";
            summary: string;
            versionNo: number;
        };
        DeliveryDetail: {
            artifactUrl: string;
            capabilities: {
                review: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
            };
            /** Format: uuid */
            changeRequestId: string;
            /** Format: uuid */
            changeRequestVersionId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            deliveryNo: number;
            evidenceLinks: string[];
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            projectId: string;
            /** Format: uuid */
            requirementId: string;
            requirementTitle: string;
            review: {
                comment: string | null;
                /** Format: date-time */
                createdAt: string;
                /** @enum {string} */
                decision: "ACCEPTED" | "CHANGES_REQUESTED";
                /** Format: uuid */
                deliveryId: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                reviewerId: string;
            } | null;
            /** @enum {string} */
            status: "SUBMITTED" | "CHANGES_REQUESTED" | "ACCEPTED";
            summary: string;
            versionNo: number;
        };
        DeliveryListItem: {
            artifactUrl: string;
            /** Format: uuid */
            changeRequestId: string;
            /** Format: uuid */
            changeRequestVersionId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            deliveryNo: number;
            evidenceLinks: string[];
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            projectId: string;
            /** Format: uuid */
            requirementId: string;
            requirementTitle: string;
            review: {
                comment: string | null;
                /** Format: date-time */
                createdAt: string;
                /** @enum {string} */
                decision: "ACCEPTED" | "CHANGES_REQUESTED";
                /** Format: uuid */
                deliveryId: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                reviewerId: string;
            } | null;
            /** @enum {string} */
            status: "SUBMITTED" | "CHANGES_REQUESTED" | "ACCEPTED";
            summary: string;
            versionNo: number;
        };
        Error: {
            error: {
                code: string;
                details: unknown[];
                message: string;
                /** Format: uuid */
                requestId: string;
            };
        };
        FrozenVersion: {
            acceptanceCriteria: string[];
            approvals: {
                /** Format: uuid */
                actorId: string;
                /** Format: uuid */
                changeRequestVersionId: string;
                comment: string | null;
                /** Format: date-time */
                createdAt: string;
                /** @enum {string} */
                decision: "APPROVED" | "REJECTED";
                /** Format: uuid */
                id: string;
                /** @enum {string} */
                step: "VENDOR" | "CLIENT";
            }[];
            /** Format: uuid */
            changeRequestId: string;
            costDeltaMinor: number;
            currency: string;
            estimateHours: string;
            /** Format: uuid */
            id: string;
            requirementRevision: {
                acceptanceCriteria: string[];
                content: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                createdBy: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                requirementId: string;
                revisionNo: number;
            };
            /** Format: uuid */
            requirementRevisionId: string;
            scheduleDeltaDays: number;
            scopeSnapshot: string;
            /** Format: date-time */
            submittedAt: string;
            /** Format: uuid */
            submittedBy: string;
            versionNo: number;
        };
        Person: {
            displayName: string;
            /** @enum {string} */
            role: "OWNER" | "DEVELOPER" | "CLIENT";
            /** Format: uuid */
            userId: string;
        };
        Project: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            name: string;
            /** @enum {string} */
            projectRole: "OWNER" | "DEVELOPER" | "CLIENT";
            /** @enum {string} */
            status: "ACTIVE" | "ARCHIVED";
            /** Format: uuid */
            workspaceId: string;
        };
        ProjectCreated: {
            baselineScope: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            name: string;
            /** @enum {string} */
            projectRole: "OWNER" | "DEVELOPER" | "CLIENT";
            /** @enum {string} */
            status: "ACTIVE" | "ARCHIVED";
            /** Format: uuid */
            workspaceId: string;
        };
        ProjectDetail: {
            baselineScope: string;
            capabilities: {
                assignDeveloper: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                bindClient: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                createRequirement: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                manageApiTokens: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
            };
            clientAssignmentLocked: boolean;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            members: {
                displayName: string;
                /** @enum {string} */
                role: "OWNER" | "DEVELOPER" | "CLIENT";
                /** Format: uuid */
                userId: string;
            }[];
            name: string;
            owner: {
                displayName: string;
                /** @enum {string} */
                role: "OWNER" | "DEVELOPER" | "CLIENT";
                /** Format: uuid */
                userId: string;
            };
            /** @enum {string} */
            projectRole: "OWNER" | "DEVELOPER" | "CLIENT";
            /** @enum {string} */
            status: "ACTIVE" | "ARCHIVED";
            /** Format: uuid */
            workspaceId: string;
        };
        Requirement: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            draftVersion: number;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            latestRevisionId: string | null;
            originalText: string;
            /** Format: uuid */
            projectId: string;
            /** @enum {string} */
            status: "DRAFT" | "CLARIFYING" | "READY";
            title: string;
            /** Format: date-time */
            updatedAt: string;
        };
        RequirementDetail: {
            capabilities: {
                answerQuestion: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                askQuestion: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                createChangeRequest: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                createRevision: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                editDraft: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
                markReady: {
                    /** @enum {boolean} */
                    allowed: true;
                } | {
                    /** @enum {boolean} */
                    allowed: false;
                    /** @enum {string} */
                    reasonCode: "ROLE_FORBIDDEN" | "INVALID_TRANSITION" | "CLIENT_ASSIGNMENT_LOCKED" | "REVIEW_IN_PROGRESS" | "CLIENT_REQUIRED" | "ROLE_CONFLICT" | "REVISION_NOT_READY" | "UNANSWERED_QUESTIONS" | "ASSESSMENT_INCOMPLETE" | "ALREADY_REVIEWED" | "DELIVERY_PENDING" | "DELIVERY_COMPLETED" | "VERSION_EXHAUSTED" | "BUSINESS_RULE_VIOLATION";
                };
            };
            clarifications: {
                /** Format: uuid */
                authorId: string;
                body: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** @enum {string} */
                kind: "QUESTION" | "ANSWER";
                /** Format: uuid */
                parentId: string | null;
                /** Format: uuid */
                requirementId: string;
            }[];
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            draftVersion: number;
            /** Format: uuid */
            id: string;
            latestRevision: {
                acceptanceCriteria: string[];
                content: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                createdBy: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                requirementId: string;
                revisionNo: number;
            } | null;
            /** Format: uuid */
            latestRevisionId: string | null;
            originalText: string;
            /** Format: uuid */
            projectId: string;
            /** @enum {string} */
            status: "DRAFT" | "CLARIFYING" | "READY";
            title: string;
            /** Format: date-time */
            updatedAt: string;
        };
        RequirementListItem: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            draftVersion: number;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            latestRevisionId: string | null;
            latestRevisionNo: number | null;
            /** Format: uuid */
            projectId: string;
            /** @enum {string} */
            status: "DRAFT" | "CLARIFYING" | "READY";
            title: string;
            /** Format: date-time */
            updatedAt: string;
        };
        Revision: {
            acceptanceCriteria: string[];
            content: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            requirementId: string;
            revisionNo: number;
        };
        RevisionCreated: {
            acceptanceCriteria: string[];
            content: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            draftVersion: number;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            latestRevisionId: string | null;
            /** Format: uuid */
            requirementId: string;
            revisionNo: number;
            /** @enum {string} */
            status: "DRAFT" | "CLARIFYING" | "READY";
        };
        RevisionDetail: {
            acceptanceCriteria: string[];
            content: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            projectId: string;
            /** Format: uuid */
            requirementId: string;
            revisionNo: number;
        };
        SubmittedChange: {
            /** Format: uuid */
            changeRequestId: string;
            /** Format: uuid */
            changeRequestVersionId: string;
            lockVersion: number;
            /** @enum {string} */
            status: "SUBMITTED";
            versionNo: number;
        };
        User: {
            /** Format: date-time */
            createdAt: string;
            displayName: string;
            email: string;
            /** Format: uuid */
            id: string;
        };
        VersionDetail: {
            acceptanceCriteria: string[];
            approvals: {
                /** Format: uuid */
                actorId: string;
                /** Format: uuid */
                changeRequestVersionId: string;
                comment: string | null;
                /** Format: date-time */
                createdAt: string;
                /** @enum {string} */
                decision: "APPROVED" | "REJECTED";
                /** Format: uuid */
                id: string;
                /** @enum {string} */
                step: "VENDOR" | "CLIENT";
            }[];
            /** Format: uuid */
            changeRequestId: string;
            costDeltaMinor: number;
            currency: string;
            estimateHours: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            projectId: string;
            /** Format: uuid */
            requirementId: string;
            requirementRevision: {
                acceptanceCriteria: string[];
                content: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                createdBy: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                requirementId: string;
                revisionNo: number;
            };
            /** Format: uuid */
            requirementRevisionId: string;
            scheduleDeltaDays: number;
            scopeSnapshot: string;
            /** Format: date-time */
            submittedAt: string;
            /** Format: uuid */
            submittedBy: string;
            versionNo: number;
        };
        Workspace: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            name: string;
            /** @enum {string} */
            workspaceRole: "OWNER" | "DEVELOPER";
        };
        WorkspaceMember: {
            /** Format: date-time */
            createdAt: string;
            displayName: string;
            email: string;
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            role: "OWNER" | "DEVELOPER";
            /** Format: uuid */
            userId: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    ApiTokens_revoke: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Auth_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                    password: string;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            user: components["schemas"]["User"];
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Auth_logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Auth_register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    displayName: string;
                    /** Format: email */
                    email: string;
                    password: string;
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** Format: uuid */
                            id: string;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Changes_detail: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ChangeDetail"];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Changes_patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    acceptanceCriteria?: string[] | null;
                    costDeltaMinor?: number | null;
                    currency?: string | null;
                    estimateHours?: string | null;
                    expectedVersion: number;
                    /** Format: uuid */
                    requirementRevisionId?: string;
                    scheduleDeltaDays?: number | null;
                    scopeSummary?: string | null;
                } | unknown | unknown | unknown | unknown | unknown | unknown | unknown;
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ChangeDraft"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Changes_client: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    comment?: string;
                    /** @enum {string} */
                    decision: "APPROVED" | "REJECTED";
                    expectedVersion: number;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ChangeDecision"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Deliveries_history: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Delivery"][];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Deliveries_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uri */
                    artifactUrl: string;
                    evidenceLinks?: string[];
                    summary: string;
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Delivery"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Changes_reopen: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    expectedVersion: number;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ChangeDraft"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Changes_submit: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    expectedVersion: number;
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["SubmittedChange"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Changes_vendor: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    comment?: string;
                    /** @enum {string} */
                    decision: "APPROVED" | "REJECTED";
                    expectedVersion: number;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ChangeDecision"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Changes_versionDetail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                versionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["VersionDetail"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Dashboard_read: {
        parameters: {
            query?: {
                bucket?: "mine" | "waiting" | "completed";
                limit?: number;
                offset?: number;
                projectId?: string;
                workspaceId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Dashboard"];
                        meta: {
                            /** Format: date-time */
                            asOf: string;
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Deliveries_detail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["DeliveryDetail"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Deliveries_review: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    comment?: string;
                    /** @enum {string} */
                    decision: "ACCEPTED";
                } | {
                    comment: string;
                    /** @enum {string} */
                    decision: "CHANGES_REQUESTED";
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Delivery"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Auth_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            user: components["schemas"]["User"];
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Projects_list: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
                workspaceId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Project"][];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Projects_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    baselineScope: string;
                    name: string;
                    /** Format: uuid */
                    workspaceId: string;
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ProjectCreated"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Projects_detail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ProjectDetail"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    ApiTokens_list: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            name: string;
                            /** Format: uuid */
                            projectId: string;
                            /** Format: date-time */
                            revokedAt: string | null;
                            scopes: "approved_specs:read"[];
                            /** @enum {string} */
                            status: "ACTIVE" | "EXPIRED" | "REVOKED" | "UNAVAILABLE";
                        }[];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    ApiTokens_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @default 30 */
                    expiresInDays?: number;
                    name: string;
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            name: string;
                            /** Format: uuid */
                            projectId: string;
                            /** Format: date-time */
                            revokedAt: string | null;
                            scopes: "approved_specs:read"[];
                            /** @enum {string} */
                            status: "ACTIVE" | "EXPIRED" | "REVOKED" | "UNAVAILABLE";
                            token: string;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    ApprovedSpecs_list: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** Format: date-time */
                            approvedAt: string;
                            approvedScope: {
                                acceptanceCriteria: string[];
                                summary: string;
                            };
                            /** Format: uuid */
                            changeRequestId: string;
                            /** Format: uuid */
                            projectId: string;
                            referencedRequirement: {
                                acceptanceCriteria: string[];
                                content: string;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: uuid */
                                revisionId: string;
                                revisionNo: number;
                            };
                            /** Format: uuid */
                            requirementId: string;
                            /** Format: date-time */
                            submittedAt: string;
                            /** Format: uuid */
                            versionId: string;
                            versionNo: number;
                        }[];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    ApprovedSpecs_detail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                versionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** Format: date-time */
                            approvedAt: string;
                            approvedScope: {
                                acceptanceCriteria: string[];
                                summary: string;
                            };
                            /** Format: uuid */
                            changeRequestId: string;
                            /** Format: uuid */
                            projectId: string;
                            referencedRequirement: {
                                acceptanceCriteria: string[];
                                content: string;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: uuid */
                                revisionId: string;
                                revisionNo: number;
                            };
                            /** Format: uuid */
                            requirementId: string;
                            /** Format: date-time */
                            submittedAt: string;
                            /** Format: uuid */
                            versionId: string;
                            versionNo: number;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    AuditRead_list: {
        parameters: {
            query?: {
                entityId?: string;
                entityType?: "project" | "requirement" | "clarification" | "requirement_revision" | "change_request" | "delivery" | "api_token";
                eventType?: "api_token.created" | "api_token.revoked" | "api_token.used" | "project.created" | "project.developer_added" | "project.client_bound" | "project.client_replaced" | "requirement.created" | "requirement.draft_updated" | "clarification.question_added" | "clarification.answer_added" | "requirement.revision_created" | "requirement.marked_ready" | "change_request.created" | "change_request.draft_updated" | "change_request.reopened" | "change_request.submitted" | "change_request.vendor_decided" | "change_request.client_decided" | "delivery.submitted" | "delivery.reviewed";
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["AuditEvent"][];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Changes_list: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
                requirementId?: string;
                status?: "DRAFT" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED";
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ChangeListItem"][];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Projects_client: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Person"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Copilot_message: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @default [] */
                    history?: {
                        assistant: string;
                        user: string;
                    }[];
                    message: string;
                    page?: {
                        /** @enum {string} */
                        kind: "overview" | "dashboard" | "requirements" | "changes" | "deliveries" | "members" | "audit";
                    } | {
                        /** Format: uuid */
                        id: string;
                        /** @enum {string} */
                        kind: "requirement";
                        /** Format: uuid */
                        revisionId?: string;
                    } | {
                        /** Format: uuid */
                        id: string;
                        /** @enum {string} */
                        kind: "change";
                        /** Format: uuid */
                        versionId?: string;
                    } | {
                        /** Format: uuid */
                        id: string;
                        /** @enum {string} */
                        kind: "delivery";
                    };
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            context: {
                                historyDropped: number;
                                toolCalls: number;
                                truncated: boolean;
                            };
                            /** Format: uuid */
                            conversationTurnId: string;
                            /** Format: uuid */
                            projectId: string;
                            result: {
                                answer: string;
                                blockers: string[];
                                nextSteps: {
                                    sourceIds: string[];
                                    text: string;
                                }[];
                                sourceIds: string[];
                            };
                            sources: {
                                href: string;
                                /** Format: uuid */
                                id: string;
                                key: string;
                                /** Format: uuid */
                                projectId: string;
                                /** Format: date-time */
                                readAt: string;
                                title: string;
                                /** @enum {string} */
                                type: "project" | "document" | "requirement" | "revision" | "change_request" | "change_version" | "delivery";
                                version: string;
                            }[];
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Deliveries_list: {
        parameters: {
            query?: {
                changeRequestId?: string;
                limit?: number;
                offset?: number;
                status?: "SUBMITTED" | "CHANGES_REQUESTED" | "ACCEPTED";
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["DeliveryListItem"][];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Projects_add: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @enum {string} */
                    role: "DEVELOPER";
                    /** Format: uuid */
                    userId: string;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Person"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Person"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Requirements_list: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["RequirementListItem"][];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Requirements_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    originalText: string;
                    title: string;
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Requirement"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Documents_list: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                projectId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            items: ({
                                /** Format: uuid */
                                currentVersionId: string | null;
                                historyTruncated: boolean;
                                /** Format: uuid */
                                id: string;
                                /** Format: uuid */
                                sharedVersionId: string | null;
                                /** @enum {string} */
                                status: "ACTIVE" | "INACTIVE";
                                title: string;
                                version: number;
                                versions: {
                                    /** Format: date-time */
                                    createdAt: string;
                                    /** @enum {string|null} */
                                    errorCode: "UNSUPPORTED_FILE" | "INVALID_FILE" | "NO_TEXT" | "PARSE_LIMIT" | "PARSE_TIMEOUT" | "PARSE_FAILED" | "INTERRUPTED" | null;
                                    extractedChars: number;
                                    /** Format: uuid */
                                    id: string;
                                    mediaType: string;
                                    originalName: string;
                                    sizeBytes: number;
                                    /** @enum {string} */
                                    status: "PROCESSING" | "READY" | "FAILED";
                                    versionNo: number;
                                }[];
                            } | {
                                /** Format: uuid */
                                id: string;
                                sharedVersion: {
                                    /** Format: date-time */
                                    createdAt: string;
                                    /** @enum {string|null} */
                                    errorCode: "UNSUPPORTED_FILE" | "INVALID_FILE" | "NO_TEXT" | "PARSE_LIMIT" | "PARSE_TIMEOUT" | "PARSE_FAILED" | "INTERRUPTED" | null;
                                    extractedChars: number;
                                    /** Format: uuid */
                                    id: string;
                                    mediaType: string;
                                    originalName: string;
                                    sizeBytes: number;
                                    /** @enum {string} */
                                    status: "PROCESSING" | "READY" | "FAILED";
                                    versionNo: number;
                                };
                                title: string;
                            })[];
                            /** @enum {string} */
                            projectRole: "OWNER" | "DEVELOPER" | "CLIENT";
                            writable: boolean;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Documents_upload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                projectId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Format: uuid */
                    documentId?: string;
                    expectedVersion?: string;
                    /** Format: binary */
                    file: string;
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** Format: uuid */
                            documentId: string;
                            errorCode: string | null;
                            /** @enum {string} */
                            status: "READY" | "FAILED";
                            /** Format: uuid */
                            versionId: string;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Documents_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                documentId: string;
                projectId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    expectedVersion: number;
                    /** Format: uuid */
                    sharedVersionId?: string | null;
                    /** @enum {string} */
                    status?: "ACTIVE" | "INACTIVE";
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** Format: uuid */
                            id: string;
                            version: number;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Documents_read: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                documentId: string;
                projectId: string;
                versionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            chunks: {
                                content: string;
                                /** Format: uuid */
                                id: string;
                                locatorEnd: number;
                                /** @enum {string} */
                                locatorKind: "page" | "paragraph";
                                locatorStart: number;
                                ordinal: number;
                            }[];
                            /** Format: uuid */
                            documentId: string;
                            hasMore: boolean;
                            version: {
                                /** Format: date-time */
                                createdAt: string;
                                /** @enum {string|null} */
                                errorCode: "UNSUPPORTED_FILE" | "INVALID_FILE" | "NO_TEXT" | "PARSE_LIMIT" | "PARSE_TIMEOUT" | "PARSE_FAILED" | "INTERRUPTED" | null;
                                extractedChars: number;
                                /** Format: uuid */
                                id: string;
                                mediaType: string;
                                originalName: string;
                                sizeBytes: number;
                                /** @enum {string} */
                                status: "PROCESSING" | "READY" | "FAILED";
                                versionNo: number;
                            };
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Requirements_detail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["RequirementDetail"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Requirements_patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    expectedVersion: number;
                    originalText?: string;
                    title?: string;
                } | unknown | unknown;
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Requirement"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Ai_analyze: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    draft?: {
                        acceptanceCriteria: string[];
                        content: string;
                    };
                    expectedVersion: number;
                    /** @default true */
                    includeClarifications?: boolean;
                    /** Format: uuid */
                    revisionId?: string;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** Format: uuid */
                            analysisId: string;
                            /** @description Untrusted AI draft. Combined text length <=6000 UTF-16 code units. Not approval or an automatic business write. */
                            result: {
                                acceptanceCriteria: string[];
                                assumptions: string[];
                                openQuestions: string[];
                                risks: string[];
                                summary: string;
                            };
                            /** @enum {integer} */
                            schemaVersion: 1;
                            source: {
                                clarificationIds: string[];
                                draftVersion: number;
                                includesUnsavedDraft: boolean;
                                /** Format: date-time */
                                readAt: string;
                                /** Format: uuid */
                                requirementId: string;
                                /** Format: uuid */
                                revisionId: string | null;
                            };
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Ai_assist: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    draft?: {
                        assumptions: string[];
                        questions: {
                            body: string;
                            /** Format: uuid */
                            id: string;
                            reason: string;
                        }[];
                        risks: string[];
                    };
                    expectedVersion: number;
                    /** @default  */
                    instruction?: string;
                    /** @enum {string} */
                    mode: "clarify";
                } | {
                    draft?: {
                        acceptanceCriteria: string[];
                        assumptions: string[];
                        content: string;
                        openQuestions: string[];
                        risks: string[];
                    };
                    expectedVersion: number;
                    /** @default  */
                    instruction?: string;
                    /** @enum {string} */
                    mode: "specification";
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** Format: uuid */
                            analysisId: string;
                            /** @enum {string} */
                            mode: "clarify";
                            result: {
                                assumptions: string[];
                                questions: {
                                    body: string;
                                    reason: string;
                                }[];
                                risks: string[];
                            };
                            /** @enum {integer} */
                            schemaVersion: 1;
                            source: {
                                background: {
                                    /** Format: uuid */
                                    chunkId: string;
                                    /** Format: uuid */
                                    documentId: string;
                                    href: string;
                                    locatorEnd: number;
                                    /** @enum {string} */
                                    locatorKind: "page" | "paragraph";
                                    locatorStart: number;
                                    title: string;
                                    /** Format: uuid */
                                    versionId: string;
                                    versionNo: number;
                                }[];
                                clarificationIds: string[];
                                draftVersion: number;
                                includesUnsavedDraft: boolean;
                                /** Format: date-time */
                                readAt: string;
                                /** Format: uuid */
                                requirementId: string;
                                /** Format: uuid */
                                revisionId: string | null;
                            };
                        } | {
                            /** Format: uuid */
                            analysisId: string;
                            /** @enum {string} */
                            mode: "specification";
                            result: {
                                acceptanceCriteria: string[];
                                assumptions: string[];
                                content: string;
                                openQuestions: string[];
                                risks: string[];
                            };
                            /** @enum {integer} */
                            schemaVersion: 1;
                            source: {
                                background: {
                                    /** Format: uuid */
                                    chunkId: string;
                                    /** Format: uuid */
                                    documentId: string;
                                    href: string;
                                    locatorEnd: number;
                                    /** @enum {string} */
                                    locatorKind: "page" | "paragraph";
                                    locatorStart: number;
                                    title: string;
                                    /** Format: uuid */
                                    versionId: string;
                                    versionNo: number;
                                }[];
                                clarificationIds: string[];
                                draftVersion: number;
                                includesUnsavedDraft: boolean;
                                /** Format: date-time */
                                readAt: string;
                                /** Format: uuid */
                                requirementId: string;
                                /** Format: uuid */
                                revisionId: string | null;
                            };
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Changes_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": Record<string, never>;
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ChangeDraft"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Requirements_clarify: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    body: string;
                    expectedVersion: number;
                    /** @enum {string} */
                    kind: "QUESTION";
                    /** @enum {string|null} */
                    parentId?: null;
                } | {
                    body: string;
                    expectedVersion: number;
                    /** @enum {string} */
                    kind: "ANSWER";
                    /** Format: uuid */
                    parentId: string;
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ClarificationCreated"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Proposals_list: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            hasMore: boolean;
                            items: ({
                                baseChangeVersion: number | null;
                                baseRequirementVersion: number;
                                /** Format: uuid */
                                changeRequestId: string | null;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: date-time */
                                executedAt: string | null;
                                /** Format: date-time */
                                expiresAt: string;
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                kind: "publish_questions";
                                /** Format: uuid */
                                operationId: string | null;
                                payload: {
                                    assumptions: string[];
                                    questions: {
                                        body: string;
                                        /** Format: uuid */
                                        id: string;
                                        reason: string;
                                        selected: boolean;
                                    }[];
                                    risks: string[];
                                };
                                /** Format: uuid */
                                requirementId: string;
                                result: {
                                    /** Format: uuid */
                                    changeRequestId?: string;
                                    changeVersion?: number;
                                    clarificationIds?: string[];
                                    requirementVersion: number;
                                    /** Format: uuid */
                                    revisionId?: string;
                                } | null;
                                sources: ({
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "requirement";
                                    version: number;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "revision";
                                } | {
                                    /** Format: uuid */
                                    chunkId: string;
                                    /** Format: uuid */
                                    documentId: string;
                                    /** @enum {string} */
                                    type: "document";
                                    /** Format: uuid */
                                    versionId: string;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "working_draft";
                                    version: number;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "change_request";
                                    version: number;
                                })[];
                                /** @enum {string} */
                                status: "DRAFT" | "EXECUTED";
                                /** Format: date-time */
                                updatedAt: string;
                                /** Format: uuid */
                                userId: string;
                                version: number;
                            } | {
                                baseChangeVersion: number | null;
                                baseRequirementVersion: number;
                                /** Format: uuid */
                                changeRequestId: string | null;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: date-time */
                                executedAt: string | null;
                                /** Format: date-time */
                                expiresAt: string;
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                kind: "create_revision";
                                /** Format: uuid */
                                operationId: string | null;
                                payload: {
                                    acceptanceCriteria: string[];
                                    assumptions: string[];
                                    content: string;
                                    openQuestions: string[];
                                    risks: string[];
                                };
                                /** Format: uuid */
                                requirementId: string;
                                result: {
                                    /** Format: uuid */
                                    changeRequestId?: string;
                                    changeVersion?: number;
                                    clarificationIds?: string[];
                                    requirementVersion: number;
                                    /** Format: uuid */
                                    revisionId?: string;
                                } | null;
                                sources: ({
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "requirement";
                                    version: number;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "revision";
                                } | {
                                    /** Format: uuid */
                                    chunkId: string;
                                    /** Format: uuid */
                                    documentId: string;
                                    /** @enum {string} */
                                    type: "document";
                                    /** Format: uuid */
                                    versionId: string;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "working_draft";
                                    version: number;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "change_request";
                                    version: number;
                                })[];
                                /** @enum {string} */
                                status: "DRAFT" | "EXECUTED";
                                /** Format: date-time */
                                updatedAt: string;
                                /** Format: uuid */
                                userId: string;
                                version: number;
                            } | {
                                baseChangeVersion: number | null;
                                baseRequirementVersion: number;
                                /** Format: uuid */
                                changeRequestId: string | null;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: date-time */
                                executedAt: string | null;
                                /** Format: date-time */
                                expiresAt: string;
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                kind: "create_change_draft";
                                /** Format: uuid */
                                operationId: string | null;
                                payload: {
                                    acceptanceCriteria: string[] | null;
                                    costDeltaMinor: number | null;
                                    currency: string | null;
                                    estimateHours: string | null;
                                    /** Format: uuid */
                                    requirementRevisionId: string;
                                    scheduleDeltaDays: number | null;
                                    scopeSummary: string | null;
                                };
                                /** Format: uuid */
                                requirementId: string;
                                result: {
                                    /** Format: uuid */
                                    changeRequestId?: string;
                                    changeVersion?: number;
                                    clarificationIds?: string[];
                                    requirementVersion: number;
                                    /** Format: uuid */
                                    revisionId?: string;
                                } | null;
                                sources: ({
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "requirement";
                                    version: number;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "revision";
                                } | {
                                    /** Format: uuid */
                                    chunkId: string;
                                    /** Format: uuid */
                                    documentId: string;
                                    /** @enum {string} */
                                    type: "document";
                                    /** Format: uuid */
                                    versionId: string;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "working_draft";
                                    version: number;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "change_request";
                                    version: number;
                                })[];
                                /** @enum {string} */
                                status: "DRAFT" | "EXECUTED";
                                /** Format: date-time */
                                updatedAt: string;
                                /** Format: uuid */
                                userId: string;
                                version: number;
                            } | {
                                baseChangeVersion: number | null;
                                baseRequirementVersion: number;
                                /** Format: uuid */
                                changeRequestId: string | null;
                                /** Format: date-time */
                                createdAt: string;
                                /** Format: date-time */
                                executedAt: string | null;
                                /** Format: date-time */
                                expiresAt: string;
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                kind: "update_change_draft";
                                /** Format: uuid */
                                operationId: string | null;
                                payload: {
                                    acceptanceCriteria: string[] | null;
                                    costDeltaMinor: number | null;
                                    currency: string | null;
                                    estimateHours: string | null;
                                    /** Format: uuid */
                                    requirementRevisionId: string;
                                    scheduleDeltaDays: number | null;
                                    scopeSummary: string | null;
                                };
                                /** Format: uuid */
                                requirementId: string;
                                result: {
                                    /** Format: uuid */
                                    changeRequestId?: string;
                                    changeVersion?: number;
                                    clarificationIds?: string[];
                                    requirementVersion: number;
                                    /** Format: uuid */
                                    revisionId?: string;
                                } | null;
                                sources: ({
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "requirement";
                                    version: number;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "revision";
                                } | {
                                    /** Format: uuid */
                                    chunkId: string;
                                    /** Format: uuid */
                                    documentId: string;
                                    /** @enum {string} */
                                    type: "document";
                                    /** Format: uuid */
                                    versionId: string;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "working_draft";
                                    version: number;
                                } | {
                                    /** Format: uuid */
                                    id: string;
                                    /** @enum {string} */
                                    type: "change_request";
                                    version: number;
                                })[];
                                /** @enum {string} */
                                status: "DRAFT" | "EXECUTED";
                                /** Format: date-time */
                                updatedAt: string;
                                /** Format: uuid */
                                userId: string;
                                version: number;
                            })[];
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Proposals_prepare: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    changeRequestId?: string;
                    /** Format: uuid */
                    draftId?: string;
                    expectedChangeVersion?: number;
                    expectedDraftVersion?: number;
                    expectedVersion: number;
                    instruction?: string;
                    /** @enum {string} */
                    kind: "publish_questions" | "create_revision" | "create_change_draft" | "update_change_draft";
                    /** @enum {string} */
                    source: "generate" | "working_draft" | "current";
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "publish_questions";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                assumptions: string[];
                                questions: {
                                    body: string;
                                    /** Format: uuid */
                                    id: string;
                                    reason: string;
                                    selected: boolean;
                                }[];
                                risks: string[];
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "create_revision";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[];
                                assumptions: string[];
                                content: string;
                                openQuestions: string[];
                                risks: string[];
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "create_change_draft";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[] | null;
                                costDeltaMinor: number | null;
                                currency: string | null;
                                estimateHours: string | null;
                                /** Format: uuid */
                                requirementRevisionId: string;
                                scheduleDeltaDays: number | null;
                                scopeSummary: string | null;
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "update_change_draft";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[] | null;
                                costDeltaMinor: number | null;
                                currency: string | null;
                                estimateHours: string | null;
                                /** Format: uuid */
                                requirementRevisionId: string;
                                scheduleDeltaDays: number | null;
                                scopeSummary: string | null;
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Proposals_read: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                proposalId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "publish_questions";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                assumptions: string[];
                                questions: {
                                    body: string;
                                    /** Format: uuid */
                                    id: string;
                                    reason: string;
                                    selected: boolean;
                                }[];
                                risks: string[];
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "create_revision";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[];
                                assumptions: string[];
                                content: string;
                                openQuestions: string[];
                                risks: string[];
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "create_change_draft";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[] | null;
                                costDeltaMinor: number | null;
                                currency: string | null;
                                estimateHours: string | null;
                                /** Format: uuid */
                                requirementRevisionId: string;
                                scheduleDeltaDays: number | null;
                                scopeSummary: string | null;
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "update_change_draft";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[] | null;
                                costDeltaMinor: number | null;
                                currency: string | null;
                                estimateHours: string | null;
                                /** Format: uuid */
                                requirementRevisionId: string;
                                scheduleDeltaDays: number | null;
                                scopeSummary: string | null;
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Proposals_edit: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                proposalId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    content: {
                        /** @enum {string} */
                        kind: "publish_questions";
                        payload: {
                            assumptions: string[];
                            questions: {
                                body: string;
                                /** Format: uuid */
                                id: string;
                                reason: string;
                                selected: boolean;
                            }[];
                            risks: string[];
                        };
                    } | {
                        /** @enum {string} */
                        kind: "create_revision";
                        payload: {
                            acceptanceCriteria: string[];
                            assumptions: string[];
                            content: string;
                            openQuestions: string[];
                            risks: string[];
                        };
                    } | {
                        /** @enum {string} */
                        kind: "create_change_draft";
                        payload: {
                            acceptanceCriteria: string[] | null;
                            costDeltaMinor: number | null;
                            currency: string | null;
                            estimateHours: string | null;
                            /** Format: uuid */
                            requirementRevisionId: string;
                            scheduleDeltaDays: number | null;
                            scopeSummary: string | null;
                        };
                    } | {
                        /** @enum {string} */
                        kind: "update_change_draft";
                        payload: {
                            acceptanceCriteria: string[] | null;
                            costDeltaMinor: number | null;
                            currency: string | null;
                            estimateHours: string | null;
                            /** Format: uuid */
                            requirementRevisionId: string;
                            scheduleDeltaDays: number | null;
                            scopeSummary: string | null;
                        };
                    };
                    expectedProposalVersion: number;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "publish_questions";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                assumptions: string[];
                                questions: {
                                    body: string;
                                    /** Format: uuid */
                                    id: string;
                                    reason: string;
                                    selected: boolean;
                                }[];
                                risks: string[];
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "create_revision";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[];
                                assumptions: string[];
                                content: string;
                                openQuestions: string[];
                                risks: string[];
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "create_change_draft";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[] | null;
                                costDeltaMinor: number | null;
                                currency: string | null;
                                estimateHours: string | null;
                                /** Format: uuid */
                                requirementRevisionId: string;
                                scheduleDeltaDays: number | null;
                                scopeSummary: string | null;
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "update_change_draft";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[] | null;
                                costDeltaMinor: number | null;
                                currency: string | null;
                                estimateHours: string | null;
                                /** Format: uuid */
                                requirementRevisionId: string;
                                scheduleDeltaDays: number | null;
                                scopeSummary: string | null;
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Proposals_remove: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                proposalId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    expectedProposalVersion: number;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** @enum {boolean} */
                            deleted: true;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Proposals_execute: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                proposalId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    expectedChangeVersion?: number;
                    expectedProposalVersion: number;
                    expectedVersion: number;
                    /** Format: uuid */
                    operationId: string;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "publish_questions";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                assumptions: string[];
                                questions: {
                                    body: string;
                                    /** Format: uuid */
                                    id: string;
                                    reason: string;
                                    selected: boolean;
                                }[];
                                risks: string[];
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "create_revision";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[];
                                assumptions: string[];
                                content: string;
                                openQuestions: string[];
                                risks: string[];
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "create_change_draft";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[] | null;
                                costDeltaMinor: number | null;
                                currency: string | null;
                                estimateHours: string | null;
                                /** Format: uuid */
                                requirementRevisionId: string;
                                scheduleDeltaDays: number | null;
                                scopeSummary: string | null;
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseChangeVersion: number | null;
                            baseRequirementVersion: number;
                            /** Format: uuid */
                            changeRequestId: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            executedAt: string | null;
                            /** Format: date-time */
                            expiresAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "update_change_draft";
                            /** Format: uuid */
                            operationId: string | null;
                            payload: {
                                acceptanceCriteria: string[] | null;
                                costDeltaMinor: number | null;
                                currency: string | null;
                                estimateHours: string | null;
                                /** Format: uuid */
                                requirementRevisionId: string;
                                scheduleDeltaDays: number | null;
                                scopeSummary: string | null;
                            };
                            /** Format: uuid */
                            requirementId: string;
                            result: {
                                /** Format: uuid */
                                changeRequestId?: string;
                                changeVersion?: number;
                                clarificationIds?: string[];
                                requirementVersion: number;
                                /** Format: uuid */
                                revisionId?: string;
                            } | null;
                            sources: ({
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "requirement";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "revision";
                            } | {
                                /** Format: uuid */
                                chunkId: string;
                                /** Format: uuid */
                                documentId: string;
                                /** @enum {string} */
                                type: "document";
                                /** Format: uuid */
                                versionId: string;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "working_draft";
                                version: number;
                            } | {
                                /** Format: uuid */
                                id: string;
                                /** @enum {string} */
                                type: "change_request";
                                version: number;
                            })[];
                            /** @enum {string} */
                            status: "DRAFT" | "EXECUTED";
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Requirements_ready: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    expectedVersion: number;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Requirement"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Requirements_history: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Revision"][];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Requirements_revision: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    acceptanceCriteria: string[];
                    content: string;
                    expectedVersion: number;
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["RevisionCreated"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Requirements_revisionDetail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                revisionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["RevisionDetail"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    WorkingDrafts_receipt: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                operationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            clarificationIds?: string[];
                            /** Format: uuid */
                            draftId: string;
                            /** @enum {string} */
                            kind: "clarify" | "specification";
                            /** Format: uuid */
                            operationId: string;
                            requirementVersion: number;
                            /** Format: uuid */
                            revisionId?: string;
                            workingDraftVersion: number;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    WorkingDrafts_list: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: ({
                            baseRequirementVersion: number;
                            body: {
                                assumptions: string[];
                                questions: {
                                    body: string;
                                    /** Format: uuid */
                                    id: string;
                                    reason: string;
                                }[];
                                risks: string[];
                            };
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "clarify";
                            publication: {
                                questions?: {
                                    /** Format: uuid */
                                    clarificationId: string;
                                    /** Format: uuid */
                                    itemId: string;
                                }[];
                                revision?: {
                                    draftVersion: number;
                                    /** Format: uuid */
                                    revisionId: string;
                                };
                            };
                            /** Format: uuid */
                            requirementId: string;
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseRequirementVersion: number;
                            body: {
                                acceptanceCriteria: string[];
                                assumptions: string[];
                                content: string;
                                openQuestions: string[];
                                risks: string[];
                            };
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "specification";
                            publication: {
                                questions?: {
                                    /** Format: uuid */
                                    clarificationId: string;
                                    /** Format: uuid */
                                    itemId: string;
                                }[];
                                revision?: {
                                    draftVersion: number;
                                    /** Format: uuid */
                                    revisionId: string;
                                };
                            };
                            /** Format: uuid */
                            requirementId: string;
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        })[];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    WorkingDrafts_save: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                kind: "clarify" | "specification";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    baseRequirementVersion: number;
                    body: {
                        assumptions: string[];
                        questions: {
                            body: string;
                            /** Format: uuid */
                            id: string;
                            reason: string;
                        }[];
                        risks: string[];
                    };
                    /** Format: uuid */
                    draftId: string | null;
                    expectedDraftVersion: number;
                    /** @enum {string} */
                    kind: "clarify";
                } | {
                    baseRequirementVersion: number;
                    body: {
                        acceptanceCriteria: string[];
                        assumptions: string[];
                        content: string;
                        openQuestions: string[];
                        risks: string[];
                    };
                    /** Format: uuid */
                    draftId: string | null;
                    expectedDraftVersion: number;
                    /** @enum {string} */
                    kind: "specification";
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            baseRequirementVersion: number;
                            body: {
                                assumptions: string[];
                                questions: {
                                    body: string;
                                    /** Format: uuid */
                                    id: string;
                                    reason: string;
                                }[];
                                risks: string[];
                            };
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "clarify";
                            publication: {
                                questions?: {
                                    /** Format: uuid */
                                    clarificationId: string;
                                    /** Format: uuid */
                                    itemId: string;
                                }[];
                                revision?: {
                                    draftVersion: number;
                                    /** Format: uuid */
                                    revisionId: string;
                                };
                            };
                            /** Format: uuid */
                            requirementId: string;
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        } | {
                            baseRequirementVersion: number;
                            body: {
                                acceptanceCriteria: string[];
                                assumptions: string[];
                                content: string;
                                openQuestions: string[];
                                risks: string[];
                            };
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: uuid */
                            id: string;
                            /** @enum {string} */
                            kind: "specification";
                            publication: {
                                questions?: {
                                    /** Format: uuid */
                                    clarificationId: string;
                                    /** Format: uuid */
                                    itemId: string;
                                }[];
                                revision?: {
                                    draftVersion: number;
                                    /** Format: uuid */
                                    revisionId: string;
                                };
                            };
                            /** Format: uuid */
                            requirementId: string;
                            /** Format: date-time */
                            updatedAt: string;
                            /** Format: uuid */
                            userId: string;
                            version: number;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    WorkingDrafts_remove: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                kind: "clarify" | "specification";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    draftId: string;
                    expectedDraftVersion: number;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            /** @enum {boolean} */
                            deleted: true;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    WorkingDrafts_publish: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                kind: "clarify" | "specification";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    draftId: string;
                    expectedDraftVersion: number;
                    expectedVersion: number;
                    /** @enum {string} */
                    kind: "clarify";
                    /** Format: uuid */
                    operationId: string;
                    questionIds: string[];
                } | {
                    /** Format: uuid */
                    draftId: string;
                    expectedDraftVersion: number;
                    expectedVersion: number;
                    /** @enum {string} */
                    kind: "specification";
                    /** Format: uuid */
                    operationId: string;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            clarificationIds?: string[];
                            /** Format: uuid */
                            draftId: string;
                            /** @enum {string} */
                            kind: "clarify" | "specification";
                            /** Format: uuid */
                            operationId: string;
                            requirementVersion: number;
                            /** Format: uuid */
                            revisionId?: string;
                            workingDraftVersion: number;
                        };
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Workspaces_list: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Workspace"][];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Workspaces_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name: string;
                };
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Workspace"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Workspaces_members: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["WorkspaceMember"][];
                        meta: {
                            hasMore: boolean;
                            limit: number;
                            offset: number;
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    Workspaces_add: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                };
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["WorkspaceMember"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["WorkspaceMember"];
                        meta: {
                            /** Format: uuid */
                            requestId: string;
                        };
                    };
                };
            };
            /** @description Safe error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Safe error envelope */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
}
