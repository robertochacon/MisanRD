# Plantillas de correo de MisanRD

HTML con estilos en línea (compatibilidad con clientes de correo) y marca MisanRD.
Se suben al proyecto hosted con `supabase config push` (secciones
`[auth.email.template.*]` en `supabase/config.toml`).

Variables disponibles de Supabase: `{{ .ConfirmationURL }}`, `{{ .Token }}`,
`{{ .SiteURL }}`, `{{ .Email }}`, `{{ .Data.full_name }}`.
