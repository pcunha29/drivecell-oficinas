# Drivecell Oficinas

SaaS self-service para pequenas oficinas se organizarem sem papelada:
kanban de ordens de reparação, clientes, viaturas e faturação mensal.
Registo no site, 7 dias grátis sem cartão, depois subscrição Stripe
(35 €/mês ou 350 €/ano, IVA incluído).

Nasceu como fork do [brakemanager](https://github.com/pcunha29/brakemanager)
(app da BlackGarage), cujo modelo de dados serve de base. A BlackGarage
continua no projeto original e não é migrada para aqui.

## Regras

- **Nunca** apontar este projeto ao Supabase da BlackGarage. Usar projetos
  Supabase próprios (`staging` e `prod`) na região UE.
- O schema vive em `supabase/migrations` e é aplicado com a Supabase CLI.
- Correções úteis do brakemanager podem ser trazidas com
  `git fetch brakemanager && git cherry-pick <commit>`.

## Arranque

```bash
cp .env.example .env.local   # preencher com o projeto Supabase novo
npm install
npm run dev
```
