# Twilight RPG — Manual do Jogador

Site estático completo com todas as informações do RPG Twilight.

## Como colocar no GitHub Pages (extremamente fácil)

1. Crie um repositório novo no GitHub (pode ser público ou privado).
2. Faça o upload destes 3 arquivos:
   - `index.html`
   - `style.css`
   - `script.js`
3. Vá em **Settings → Pages**.
4. Em **Source**, escolha **Deploy from a branch**.
5. Selecione a branch `main` (ou `master`) e a pasta `/ (root)`.
6. Clique em **Save**.

Pronto. Em 1–2 minutos o site estará no ar em:

```
https://SEU-USUARIO.github.io/NOME-DO-REPO/
```

**Não precisa de GitHub Actions, não precisa de build, não precisa de Node, nada.**

Só os 3 arquivos estáticos.

## O que tem no site

- **Universo**: princípios básicos, como entrar, criaturas, morte, comunidades e as 5 organizações de Aurora
- **Mecânicas**: atributos, perícias, sistema de dados (d10), ficha de personagem
- **Depravações**: regras gerais + as 8 depravações completas (Sombra, Carne, Mente, Alma, Sonhos, Desejos, Caos, Medo)
- **Barra de pesquisa** em tempo real que filtra seções e destaca o texto

## Dica

Se quiser customizar cores depois, é só editar as variáveis no começo do `style.css` (`:root`).
