export interface paths {
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
            entityType: "project" | "requirement" | "clarification" | "requirement_revision" | "change_request" | "delivery";
            entityVersion: number | null;
            /** @enum {string} */
            eventType: "project.created" | "project.developer_added" | "project.client_bound" | "project.client_replaced" | "requirement.created" | "requirement.draft_updated" | "clarification.question_added" | "clarification.answer_added" | "requirement.revision_created" | "requirement.marked_ready" | "change_request.created" | "change_request.draft_updated" | "change_request.reopened" | "change_request.submitted" | "change_request.vendor_decided" | "change_request.client_decided" | "delivery.submitted" | "delivery.reviewed";
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
                fields?: ("title" | "originalText" | "requirementRevisionId" | "scopeSummary" | "estimateHours" | "costDeltaMinor" | "currency" | "scheduleDeltaDays" | "acceptanceCriteria")[];
                /** @enum {string} */
                fromStatus?: "DRAFT" | "CLARIFYING" | "READY" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED" | "ACCEPTED" | "CHANGES_REQUESTED";
                /** Format: uuid */
                parentId?: string;
                /** Format: uuid */
                previousVersionId?: string;
                /** Format: uuid */
                requirementId?: string;
                /** Format: uuid */
                reviewId?: string;
                /** Format: uuid */
                revisionId?: string;
                /** @enum {string} */
                role?: "DEVELOPER";
                /** @enum {string} */
                step?: "VENDOR" | "CLIENT";
                /** @enum {string} */
                toStatus?: "DRAFT" | "CLARIFYING" | "READY" | "SUBMITTED" | "VENDOR_APPROVED" | "APPROVED" | "REJECTED" | "ACCEPTED" | "CHANGES_REQUESTED";
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
    AuditRead_list: {
        parameters: {
            query?: {
                entityId?: string;
                entityType?: "project" | "requirement" | "clarification" | "requirement_revision" | "change_request" | "delivery";
                eventType?: "project.created" | "project.developer_added" | "project.client_bound" | "project.client_replaced" | "requirement.created" | "requirement.draft_updated" | "clarification.question_added" | "clarification.answer_added" | "requirement.revision_created" | "requirement.marked_ready" | "change_request.created" | "change_request.draft_updated" | "change_request.reopened" | "change_request.submitted" | "change_request.vendor_decided" | "change_request.client_decided" | "delivery.submitted" | "delivery.reviewed";
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
