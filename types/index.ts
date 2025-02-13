export type ApplicationStatus = "pending" | "approved" | "rejected"

export type Application = {
    id: string
    title: string
    description: string
    url: string
    screenshot_url: string
    tags: string[]
    creator_id: string
    status: ApplicationStatus
    created_at: string
    profiles?: {
        email: string
    }
}

export type Like = {
    id: string
    application_id: string
    user_id: string
    created_at: string
} 