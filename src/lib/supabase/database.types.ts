
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "clientes": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"email": string | null,"id": string,"nome": string,"observacoes": string | null,"origem": string | null,"telefone": string,"telefone_em_revisao": boolean,"vendedor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"email"?: string | null,"id"?: string,"nome": string,"observacoes"?: string | null,"origem"?: string | null,"telefone": string,"telefone_em_revisao"?: boolean,"vendedor_id"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"email"?: string | null,"id"?: string,"nome"?: string,"observacoes"?: string | null,"origem"?: string | null,"telefone"?: string,"telefone_em_revisao"?: boolean,"vendedor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"conflitos_telefone": {
                  Row: {
                    "cliente_id": string,"detectado_em": string,"id": number,"motivo": string,"resolvido_em": string | null,"telefone_chave": string,"telefone_original": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_id": string,"detectado_em"?: string,"id"?: never,"motivo": string,"resolvido_em"?: string | null,"telefone_chave": string,"telefone_original": string
                  }
                  Update: {
                    "cliente_id"?: string,"detectado_em"?: string,"id"?: never,"motivo"?: string,"resolvido_em"?: string | null,"telefone_chave"?: string,"telefone_original"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conflitos_telefone_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"historico_negociacoes": {
                  Row: {
                    "alterado_em": string,"alterado_por": string | null,"campo": string,"id": number,"negociacao_id": string,"valor_anterior": string | null,"valor_novo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alterado_em"?: string,"alterado_por"?: string | null,"campo": string,"id"?: never,"negociacao_id": string,"valor_anterior"?: string | null,"valor_novo"?: string | null
                  }
                  Update: {
                    "alterado_em"?: string,"alterado_por"?: string | null,"campo"?: string,"id"?: never,"negociacao_id"?: string,"valor_anterior"?: string | null,"valor_novo"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "historico_negociacoes_alterado_por_fkey"
      columns: ["alterado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "historico_negociacoes_negociacao_id_fkey"
      columns: ["negociacao_id"]
isOneToOne: false
      referencedRelation: "negociacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "historico_negociacoes_negociacao_id_fkey"
      columns: ["negociacao_id"]
isOneToOne: false
      referencedRelation: "vw_negociacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"negociacoes": {
                  Row: {
                    "atualizado_em": string,"cliente_id": string,"criado_em": string,"data_execucao_prevista": string | null,"data_perda": string | null,"data_venda": string | null,"id": string,"motivo_perda": string | null,"servico_id": string,"status": Database["public"]['Enums']["status_negociacao"],"unidade_id": string,"valor": number,"vendedor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cliente_id": string,"criado_em"?: string,"data_execucao_prevista"?: string | null,"data_perda"?: string | null,"data_venda"?: string | null,"id"?: string,"motivo_perda"?: string | null,"servico_id": string,"status"?: Database["public"]['Enums']["status_negociacao"],"unidade_id": string,"valor": number,"vendedor_id"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"cliente_id"?: string,"criado_em"?: string,"data_execucao_prevista"?: string | null,"data_perda"?: string | null,"data_venda"?: string | null,"id"?: string,"motivo_perda"?: string | null,"servico_id"?: string,"status"?: Database["public"]['Enums']["status_negociacao"],"unidade_id"?: string,"valor"?: number,"vendedor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "negociacoes_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "negociacoes_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "negociacoes_unidade_id_fkey"
      columns: ["unidade_id"]
isOneToOne: false
      referencedRelation: "unidades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "negociacoes_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"perfis": {
                  Row: {
                    "ativo": boolean,"criado_em": string,"id": string,"nome": string,"perfil": Database["public"]['Enums']["perfil_usuario"]
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"criado_em"?: string,"id": string,"nome": string,"perfil": Database["public"]['Enums']["perfil_usuario"]
                  }
                  Update: {
                    "ativo"?: boolean,"criado_em"?: string,"id"?: string,"nome"?: string,"perfil"?: Database["public"]['Enums']["perfil_usuario"]
                  }
                  Relationships: [
                    
                  ]
                },"servicos": {
                  Row: {
                    "ativo": boolean,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"id"?: string,"nome": string
                  }
                  Update: {
                    "ativo"?: boolean,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"unidades": {
                  Row: {
                    "ativa": boolean,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativa"?: boolean,"id"?: string,"nome": string
                  }
                  Update: {
                    "ativa"?: boolean,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "vw_negociacoes": {
                  Row: {
                    "atualizado_em": string,"cliente_id": string,"cliente_nome": string,"criado_em": string,"data_execucao_prevista": string | null,"data_perda": string | null,"data_venda": string | null,"id": string,"motivo_perda": string | null,"servico_id": string,"servico_nome": string,"status": Database["public"]['Enums']["status_negociacao"],"unidade_id": string,"unidade_nome": string,"valor": number,"vendedor_id": string,"vendedor_nome": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "negociacoes_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "negociacoes_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "negociacoes_unidade_id_fkey"
      columns: ["unidade_id"]
isOneToOne: false
      referencedRelation: "unidades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "negociacoes_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "negociacoes_resultado_mes":
{ Args: { "p_ano": number,"p_mes": number }; Returns: {
              "atualizado_em": string,
"cliente_id": string,
"cliente_nome": string,
"criado_em": string,
"data_execucao_prevista": string | null,
"data_perda": string | null,
"data_venda": string | null,
"id": string,
"motivo_perda": string | null,
"servico_id": string,
"servico_nome": string,
"status": Database["public"]['Enums']["status_negociacao"],
"unidade_id": string,
"unidade_nome": string,
"valor": number,
"vendedor_id": string,
"vendedor_nome": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "vw_negociacoes"
        isOneToOne: false
        isSetofReturn: true
      } },
"normalizar_telefone":
{ Args: { "p_telefone": string }; Returns: string
                           },
"perfil_atual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["perfil_usuario"]
                           },
"reconciliar_telefones":
{ Args: Record<PropertyKey, never>; Returns: {
              "cliente_id": string,"motivo": string,"telefone_chave": string,"telefone_original": string
            }[]
                           }
          }
          Enums: {
            "perfil_usuario": "vendedor"|"gestor","status_negociacao": "em_negociacao"|"fechou"|"nao_fechou"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "perfil_usuario": ["vendedor", "gestor"],"status_negociacao": ["em_negociacao", "fechou", "nao_fechou"]
          }
        }
} as const
