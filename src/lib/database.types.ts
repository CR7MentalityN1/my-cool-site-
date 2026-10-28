export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

export type ProjectTaskStatus = 'todo' | 'in_progress' | 'done'

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
			project_activity: {
				Row: {
					id: string
					project_id: string
					actor_user_id: string | null
					type: 'project_created' | 'application_created' | 'application_accepted' | 'application_rejected' | 'member_joined' | 'task_created' | 'task_updated' | 'task_completed' | 'deadline_changed' | 'project_completed'
					title: string
					description: string | null
					metadata: Json
					created_at: string
				}
				Insert: {
					id?: string
					project_id: string
					actor_user_id?: string | null
					type: 'project_created' | 'application_created' | 'application_accepted' | 'application_rejected' | 'member_joined' | 'task_created' | 'task_updated' | 'task_completed' | 'deadline_changed' | 'project_completed'
					title: string
					description?: string | null
					metadata?: Json
					created_at?: string
				}
				Update: {
					id?: string
					project_id?: string
					actor_user_id?: string | null
					type?: 'project_created' | 'application_created' | 'application_accepted' | 'application_rejected' | 'member_joined' | 'task_created' | 'task_updated' | 'task_completed' | 'deadline_changed' | 'project_completed'
					title?: string
					description?: string | null
					metadata?: Json
					created_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'project_activity_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					},
				]
			}
			project_tasks: {
				Row: {
					id: string
					project_id: string
					title: string
					description: string | null
					status: ProjectTaskStatus
					assignee_user_id: string | null
					created_by: string
					due_date: string | null
					deadline_version: number
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					project_id: string
					title: string
					description?: string | null
					status?: ProjectTaskStatus
					assignee_user_id?: string | null
					created_by: string
					due_date?: string | null
					deadline_version?: number
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					project_id?: string
					title?: string
					description?: string | null
					status?: ProjectTaskStatus
					assignee_user_id?: string | null
					created_by?: string
					due_date?: string | null
					deadline_version?: number
					created_at?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'project_tasks_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					},
				]
			}
			notifications: {
				Row: {
					id: string
					user_id: string
					type: 'application_created' | 'application_accepted' | 'application_rejected' | 'member_joined' | 'task_assigned' | 'task_deadline_soon' | 'task_overdue' | 'task_completed'
					title: string
					message: string
					related_project_id: string | null
					related_task_id: string | null
					task_deadline_version: number | null
					task_deadline_due_at: string | null
					is_read: boolean
					created_at: string
				}
				Insert: {
					id?: string
					user_id: string
					type: 'application_created' | 'application_accepted' | 'application_rejected' | 'member_joined' | 'task_assigned' | 'task_deadline_soon' | 'task_overdue' | 'task_completed'
					title: string
					message: string
					related_project_id?: string | null
					related_task_id?: string | null
					task_deadline_version?: number | null
					task_deadline_due_at?: string | null
					is_read?: boolean
					created_at?: string
				}
				Update: {
					id?: string
					user_id?: string
					type?: 'application_created' | 'application_accepted' | 'application_rejected' | 'member_joined' | 'task_assigned' | 'task_deadline_soon' | 'task_overdue' | 'task_completed'
					title?: string
					message?: string
					related_project_id?: string | null
					related_task_id?: string | null
					task_deadline_version?: number | null
					task_deadline_due_at?: string | null
					is_read?: boolean
					created_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'notifications_related_project_id_fkey'
						columns: ['related_project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'notifications_related_task_id_fkey'
						columns: ['related_task_id']
						isOneToOne: false
						referencedRelation: 'project_tasks'
						referencedColumns: ['id']
					},
				]
			}
		}
		Views: { [_ in never]: never }
		Functions: {
			set_project_task_status: {
				Args: { p_task_id: string; p_status: ProjectTaskStatus }
				Returns: Database['public']['Tables']['project_tasks']['Row']
			}
			process_project_task_deadlines: {
				Args: Record<string, never>
				Returns: number
			}
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
