export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string
					auth_id: string
					email: string
					name: string | null
					faculty: string | null
					course: number | null
					skills: string[]
					project_description: string | null
					contacts: string | null
					avatar_url: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					auth_id: string
					email: string
					name?: string | null
					faculty?: string | null
					course?: number | null
					skills?: string[]
					project_description?: string | null
					contacts?: string | null
					avatar_url?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					auth_id?: string
					email?: string
					name?: string | null
					faculty?: string | null
					course?: number | null
					skills?: string[]
					project_description?: string | null
					contacts?: string | null
					avatar_url?: string | null
					created_at?: string
					updated_at?: string
				}
			}
			messages: {
				Row: {
					id: string
					user_id: string
					content: string
					created_at: string
				}
				Insert: {
					id?: string
					user_id: string
					content: string
					created_at?: string
				}
				Update: {
					id?: string
					user_id?: string
					content?: string
					created_at?: string
				}
			}
			projects: {
				Row: {
					id: string
					title: string
					description: string | null
					image_url: string | null
					owner_id: string
					required_roles: string[]
					current_members: string[]
					created_at: string
				}
				Insert: {
					id?: string
					title: string
					description?: string | null
					image_url?: string | null
					owner_id: string
					required_roles?: string[]
					current_members?: string[]
					created_at?: string
				}
				Update: {
					id?: string
					title?: string
					description?: string | null
					image_url?: string | null
					owner_id?: string
					required_roles?: string[]
					current_members?: string[]
					created_at?: string
				}
			}
			project_applications: {
				Row: {
					id: string
					project_id: string
					user_id: string
					status: 'pending' | 'accepted' | 'rejected'
					created_at: string
				}
				Insert: {
					id?: string
					project_id: string
					user_id: string
					status?: 'pending' | 'accepted' | 'rejected'
					created_at?: string
				}
				Update: {
					id?: string
					project_id?: string
					user_id?: string
					status?: 'pending' | 'accepted' | 'rejected'
					created_at?: string
				}
			}
		}
	}
}
