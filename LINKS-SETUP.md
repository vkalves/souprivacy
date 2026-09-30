# Souprivacy Links

Cada pessoa pode criar uma conta e uma página, em `https://souprivacy.com/seunome`.
O painel fica em `https://souprivacy.com/painel`. A página inicial e as pastas existentes permanecem como estão.

## Colocar no ar

1. Crie ou escolha um projeto Supabase.
2. Abra **SQL Editor**, cole o conteúdo de `supabase/links.sql` e execute.
3. Em **Authentication → URL Configuration**, defina Site URL como `https://souprivacy.com` e adicione `https://souprivacy.com/painel` aos Redirect URLs. Para testar uma prévia, adicione também o endereço exato da prévia seguido de `/painel`.
4. Mantenha e-mail/senha habilitados em Authentication. A confirmação de e-mail é suportada. Configure um provedor SMTP para enviar e-mails aos usuários em produção; o envio padrão do Supabase possui restrições.
5. Na Vercel, no projeto que atende este domínio, defina as variáveis:
   - `SUPABASE_URL`: URL do seu projeto Supabase.
   - `SUPABASE_PUBLISHABLE_KEY`: chave **publishable** (`sb_publishable_...`) ou a chave antiga **anon**. Nunca use `service_role` ou `sb_secret_...`.
6. A raiz do projeto Vercel deve ser a raiz deste repositório, com preset **Other**, sem comando de build nem pasta de saída. Faça um novo deploy após definir as variáveis.
7. Entre em `/painel`, crie uma conta, confirme o e-mail, preencha sua página, marque **Deixar minha página pública** e salve.

## Recursos

- Cadastro, login, confirmação de e-mail e recuperação de senha.
- Uma página por conta, endereço único e reservado no banco.
- Foto por upload ou URL; nome e descrição.
- Quatro temas, até 20 links, ordem dos botões e opção de ocultar links.
- Prévia, publicação, rascunho, cópia do endereço e exclusão da página.
- Rascunhos acessíveis só ao dono. Cada conta só altera seus próprios dados, por regras do banco (RLS).
- Links aceitam apenas HTTP/HTTPS. Textos são exibidos como texto, sem HTML.

## Verificação

Execute `node --test tests/links.test.mjs`. Também é necessário testar com um Supabase de teste antes de produção:

1. Crie as contas A e B. Publique A e deixe B como rascunho.
2. Sem login, verifique que A abre e B não aparece.
3. Com B, tente usar o mesmo endereço de A: deve mostrar que está ocupado.
4. Pela API autenticada como B, tente alterar/excluir a linha de A e gravar `user_id` de A: a RLS deve impedir.
5. Teste confirmação de e-mail, recuperação de senha, upload, renovação de sessão, reordenação, despublicação e os dois formatos `/seunome` e `/seunome/`.
6. Confira as rotas antigas `/chamada/`, `/elianefen/`, `/elianeprevias/`, `/becasantos/` e `/biancarossi/`.

## Limites desta primeira versão

Não inclui painel de moderação, métricas de cliques ou planos pagos. Avatares enviados são públicos e continuam no Storage ao trocar a foto ou excluir a página; remova arquivos sem uso pelo painel do Supabase. Caso sejam criadas novas pastas na raiz, acrescente seus nomes à lista de endereços reservados no SQL, em `shared.js` e nas regras da Vercel.

Sem as variáveis e a migração, a nova área mostra uma mensagem de configuração pendente. Cadastro e gravação real precisam ser verificados no seu projeto Supabase; os testes locais não substituem essa verificação.
