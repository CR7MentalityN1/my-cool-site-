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
					specialization: string | null
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
					specialization?: string | null
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
					specialization?: string | null
					course?: number | null
					skills?: string[]
					project_description?: string | null
					contacts?: string | null
					avatar_url?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
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
				Relationships: [
					{
						foreignKeyName: 'messages_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'profiles'
						referencedColumns: ['id']
					},
				]
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
					status: 'recruiting' | 'team_formed' | 'completed'
					result_url: string | null
					completed_at: string | null
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
					status?: 'recruiting' | 'team_formed' | 'completed'
					result_url?: string | null
					completed_at?: string | null
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
					status?: 'recruiting' | 'team_formed' | 'completed'
					result_url?: string | null
					completed_at?: string | null
					created_at?: string
				}
				Relationships: []
			}
			project_applications: {
				Row: {
					id: string
					project_id: string
					user_id: string
					status: 'pending' | 'accepted' | 'rejected'
					role_applied_for: string | null
					created_at: string
				}
				Insert: {
					id?: string
					project_id: string
					user_id: string
					status?: 'pending' | 'accepted' | 'rejected'
					role_applied_for?: string | null
					created_at?: string
				}
				Update: {
					id?: string
					project_id?: string
					user_id?: string
					status?: 'pending' | 'accepted' | 'rejected'
					role_applied_for?: string | null
					created_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'project_applications_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					},
				]
			}
			project_members: {
				Row: {
					id: string
					project_id: string
					user_id: string
					role: string | null
					joined_at: string
				}
				Insert: {
					id?: string
					project_id: string
					user_id: string
					role?: string | null
					joined_at?: string
				}
				Update: {
					id?: string
					project_id?: string
					user_id?: string
					role?: string | null
					joined_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'project_members_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					},
				]
			}
		}
		Views: { [_ in never]: never }
		Functions: {
			accept_project_application: {
				Args: { p_application_id: string }
				Returns: Database['public']['Tables']['projects']['Row']
			}
			pending_project_application_counts: {
				Args: { p_project_ids: string[] }
				Returns: {
					project_id: string
					role_applied_for: string | null
					application_count: number
				}[]
			}
		}
	}
}
