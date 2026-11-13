
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "acoes_venda": {
                  Row: {
                    "atualizado_em": string,"cliente_id": string,"criado_em": string,"data_prevista": string | null,"data_realizada": string | null,"descricao": string,"id": string,"motivo_cancelamento": string | null,"negociacao_id": string | null,"resultado": string | null,"situacao": Database["public"]['Enums']["situacao_acao"],"tipo": Database["public"]['Enums']["tipo_acao"],"vendedor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cliente_id": string,"criado_em"?: string,"data_prevista"?: string | null,"data_realizada"?: string | null,"descricao": string,"id"?: string,"motivo_cancelamento"?: string | null,"negociacao_id"?: string | null,"resultado"?: string | null,"situacao"?: Database["public"]['Enums']["situacao_acao"],"tipo": Database["public"]['Enums']["tipo_acao"],"vendedor_id"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"cliente_id"?: string,"criado_em"?: string,"data_prevista"?: string | null,"data_realizada"?: string | null,"descricao"?: string,"id"?: string,"motivo_cancelamento"?: string | null,"negociacao_id"?: string | null,"resultado"?: string | null,"situacao"?: Database["public"]['Enums']["situacao_acao"],"tipo"?: Database["public"]['Enums']["tipo_acao"],"vendedor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "acoes_venda_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "acoes_venda_negociacao_id_fkey"
      columns: ["negociacao_id"]
isOneToOne: false
      referencedRelation: "negociacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "acoes_venda_negociacao_id_fkey"
      columns: ["negociacao_id"]
isOneToOne: false
      referencedRelation: "vw_negociacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "acoes_venda_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"analises_conversa": {
                  Row: {
                    "comentario": string,"conversa_id": string,"criado_em": string,"gestora_id": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comentario": string,"conversa_id": string,"criado_em"?: string,"gestora_id"?: string,"id"?: string
                  }
                  Update: {
                    "comentario"?: string,"conversa_id"?: string,"criado_em"?: string,"gestora_id"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "analises_conversa_conversa_id_fkey"
      columns: ["conversa_id"]
isOneToOne: false
      referencedRelation: "conversas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "analises_conversa_conversa_id_fkey"
      columns: ["conversa_id"]
isOneToOne: false
      referencedRelation: "vw_conversas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "analises_conversa_gestora_id_fkey"
      columns: ["gestora_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"clientes": {
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
                },"conversas": {
                  Row: {
                    "canal": Database["public"]['Enums']["canal_conversa"],"cliente_id": string,"conteudo": string,"criado_em": string,"id": string,"motivo_correcao": string | null,"negociacao_id": string | null,"ocorrida_em": string,"registrada_por": string,"substitui_conversa_id": string | null,"vendedor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "canal": Database["public"]['Enums']["canal_conversa"],"cliente_id": string,"conteudo": string,"criado_em"?: string,"id"?: string,"motivo_correcao"?: string | null,"negociacao_id"?: string | null,"ocorrida_em": string,"registrada_por"?: string,"substitui_conversa_id"?: string | null,"vendedor_id"?: string
                  }
                  Update: {
                    "canal"?: Database["public"]['Enums']["canal_conversa"],"cliente_id"?: string,"conteudo"?: string,"criado_em"?: string,"id"?: string,"motivo_correcao"?: string | null,"negociacao_id"?: string | null,"ocorrida_em"?: string,"registrada_por"?: string,"substitui_conversa_id"?: string | null,"vendedor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_negociacao_id_fkey"
      columns: ["negociacao_id"]
isOneToOne: false
      referencedRelation: "negociacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_negociacao_id_fkey"
      columns: ["negociacao_id"]
isOneToOne: false
      referencedRelation: "vw_negociacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_registrada_por_fkey"
      columns: ["registrada_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_substitui_conversa_id_fkey"
      columns: ["substitui_conversa_id"]
isOneToOne: true
      referencedRelation: "conversas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_substitui_conversa_id_fkey"
      columns: ["substitui_conversa_id"]
isOneToOne: true
      referencedRelation: "vw_conversas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"historico_acoes": {
                  Row: {
                    "acao_id": string,"alterado_em": string,"alterado_por": string | null,"campo": string,"id": number,"valor_anterior": string | null,"valor_novo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao_id": string,"alterado_em"?: string,"alterado_por"?: string | null,"campo": string,"id"?: never,"valor_anterior"?: string | null,"valor_novo"?: string | null
                  }
                  Update: {
                    "acao_id"?: string,"alterado_em"?: string,"alterado_por"?: string | null,"campo"?: string,"id"?: never,"valor_anterior"?: string | null,"valor_novo"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "historico_acoes_acao_id_fkey"
      columns: ["acao_id"]
isOneToOne: false
      referencedRelation: "acoes_venda"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "historico_acoes_acao_id_fkey"
      columns: ["acao_id"]
isOneToOne: false
      referencedRelation: "vw_acoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "historico_acoes_alterado_por_fkey"
      columns: ["alterado_por"]
isOneToOne: false
      referencedRelation: "perfis"
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
                    "atualizado_em": string,"cliente_id": string,"criado_em": string,"data_execucao_prevista": string | null,"data_execucao_realizada": string | null,"data_perda": string | null,"data_venda": string | null,"id": string,"motivo_cancelamento_execucao": string | null,"motivo_perda": string | null,"servico_id": string,"status": Database["public"]['Enums']["status_negociacao"],"status_execucao": Database["public"]['Enums']["status_execucao"] | null,"unidade_id": string,"valor": number,"vendedor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cliente_id": string,"criado_em"?: string,"data_execucao_prevista"?: string | null,"data_execucao_realizada"?: string | null,"data_perda"?: string | null,"data_venda"?: string | null,"id"?: string,"motivo_cancelamento_execucao"?: string | null,"motivo_perda"?: string | null,"servico_id": string,"status"?: Database["public"]['Enums']["status_negociacao"],"status_execucao"?: Database["public"]['Enums']["status_execucao"] | null,"unidade_id": string,"valor": number,"vendedor_id"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"cliente_id"?: string,"criado_em"?: string,"data_execucao_prevista"?: string | null,"data_execucao_realizada"?: string | null,"data_perda"?: string | null,"data_venda"?: string | null,"id"?: string,"motivo_cancelamento_execucao"?: string | null,"motivo_perda"?: string | null,"servico_id"?: string,"status"?: Database["public"]['Enums']["status_negociacao"],"status_execucao"?: Database["public"]['Enums']["status_execucao"] | null,"unidade_id"?: string,"valor"?: number,"vendedor_id"?: string
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
            "vw_acoes": {
                  Row: {
                    "atualizado_em": string,"cliente_id": string,"cliente_nome": string,"criado_em": string,"data_prevista": string | null,"data_realizada": string | null,"descricao": string,"id": string,"motivo_cancelamento": string | null,"negociacao_id": string | null,"negociacao_rotulo": string | null,"resultado": string | null,"situacao": Database["public"]['Enums']["situacao_acao"],"tipo": Database["public"]['Enums']["tipo_acao"],"vendedor_id": string,"vendedor_nome": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "acoes_venda_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "acoes_venda_negociacao_id_fkey"
      columns: ["negociacao_id"]
isOneToOne: false
      referencedRelation: "negociacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "acoes_venda_negociacao_id_fkey"
      columns: ["negociacao_id"]
isOneToOne: false
      referencedRelation: "vw_negociacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "acoes_venda_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"vw_conversas": {
                  Row: {
                    "canal": Database["public"]['Enums']["canal_conversa"],"cliente_id": string,"cliente_nome": string,"conteudo": string,"criado_em": string,"foi_corrigida": boolean | null,"id": string,"motivo_correcao": string | null,"negociacao_id": string | null,"ocorrida_em": string,"registrada_por": string,"substitui_conversa_id": string | null,"vendedor_id": string,"vendedor_nome": string,"versao_atual": boolean | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "conversas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_negociacao_id_fkey"
      columns: ["negociacao_id"]
isOneToOne: false
      referencedRelation: "negociacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_negociacao_id_fkey"
      columns: ["negociacao_id"]
isOneToOne: false
      referencedRelation: "vw_negociacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_registrada_por_fkey"
      columns: ["registrada_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_substitui_conversa_id_fkey"
      columns: ["substitui_conversa_id"]
isOneToOne: true
      referencedRelation: "conversas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_substitui_conversa_id_fkey"
      columns: ["substitui_conversa_id"]
isOneToOne: true
      referencedRelation: "vw_conversas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversas_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"vw_negociacoes": {
                  Row: {
                    "atualizado_em": string,"cliente_id": string,"cliente_nome": string,"criado_em": string,"data_execucao_prevista": string | null,"data_execucao_realizada": string | null,"data_perda": string | null,"data_venda": string | null,"id": string,"motivo_cancelamento_execucao": string | null,"motivo_perda": string | null,"servico_id": string,"servico_nome": string,"status": Database["public"]['Enums']["status_negociacao"],"status_execucao": Database["public"]['Enums']["status_execucao"] | null,"unidade_id": string,"unidade_nome": string,"valor": number,"vendedor_id": string,"vendedor_nome": string
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
            "acoes_mes":
{ Args: { "p_ano": number,"p_mes": number }; Returns: {
              "atualizado_em": string,
"cliente_id": string,
"cliente_nome": string,
"criado_em": string,
"data_prevista": string | null,
"data_realizada": string | null,
"descricao": string,
"id": string,
"motivo_cancelamento": string | null,
"negociacao_id": string | null,
"negociacao_rotulo": string | null,
"resultado": string | null,
"situacao": Database["public"]['Enums']["situacao_acao"],
"tipo": Database["public"]['Enums']["tipo_acao"],
"vendedor_id": string,
"vendedor_nome": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "vw_acoes"
        isOneToOne: false
        isSetofReturn: true
      } },
"negociacoes_execucao_mes":
{ Args: { "p_ano": number,"p_mes": number }; Returns: {
              "atualizado_em": string,
"cliente_id": string,
"cliente_nome": string,
"criado_em": string,
"data_execucao_prevista": string | null,
"data_execucao_realizada": string | null,
"data_perda": string | null,
"data_venda": string | null,
"id": string,
"motivo_cancelamento_execucao": string | null,
"motivo_perda": string | null,
"servico_id": string,
"servico_nome": string,
"status": Database["public"]['Enums']["status_negociacao"],
"status_execucao": Database["public"]['Enums']["status_execucao"] | null,
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
"negociacoes_resultado_mes":
{ Args: { "p_ano": number,"p_mes": number }; Returns: {
              "atualizado_em": string,
"cliente_id": string,
"cliente_nome": string,
"criado_em": string,
"data_execucao_prevista": string | null,
"data_execucao_realizada": string | null,
"data_perda": string | null,
"data_venda": string | null,
"id": string,
"motivo_cancelamento_execucao": string | null,
"motivo_perda": string | null,
"servico_id": string,
"servico_nome": string,
"status": Database["public"]['Enums']["status_negociacao"],
"status_execucao": Database["public"]['Enums']["status_execucao"] | null,
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
            "canal_conversa": "whatsapp"|"instagram"|"telefone"|"email"|"presencial"|"outro","perfil_usuario": "vendedor"|"gestor","situacao_acao": "planejada"|"realizada"|"cancelada","status_execucao": "pendente"|"realizada"|"cancelada","status_negociacao": "em_negociacao"|"fechou"|"nao_fechou","tipo_acao": "ligacao"|"mensagem"|"visita"|"proposta"|"follow_up"|"outro"
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
            "canal_conversa": ["whatsapp", "instagram", "telefone", "email", "presencial", "outro"],"perfil_usuario": ["vendedor", "gestor"],"situacao_acao": ["planejada", "realizada", "cancelada"],"status_execucao": ["pendente", "realizada", "cancelada"],"status_negociacao": ["em_negociacao", "fechou", "nao_fechou"],"tipo_acao": ["ligacao", "mensagem", "visita", "proposta", "follow_up", "outro"]
          }
        }
} as const
