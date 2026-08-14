# < Chris /> — Liquid Glass Extension

Uma extensão de **Nova Guia** para o Chrome (Manifest V3) com efeitos de vidro líquido (glassmorphism), fundos animados em WebGL, Ilha Dinâmica com controle de mídia, e integração com o Gemini para produtividade.

## Por que este formato?

O Manifest V3 do Chrome **proíbe carregar código remoto** (scripts de CDN, import maps apontando para esm.sh, etc.). Por isso, todo o código e recursos são empacotados localmente no build:

- React, Three.js, OGL, postprocessing e o SDK do Gemini são bundlados pelo Vite.
- Tailwind CSS é compilado no build (PostCSS), não mais via `cdn.tailwindcss.com`.
- Fontes (Inter, Nunito, Outfit, Poppins, Material Symbols) são servidas de `public/fonts/`.
- O runtime do UnicornStudio (temas de fundo) está em `public/vendor/`.

## Build

**Pré-requisitos:** Node.js 18+

```bash
npm install
npm run build
```

O resultado fica em `dist/` — esse diretório é a extensão completa.

## Instalar no Chrome (modo desenvolvedor)

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a pasta `dist/`.
4. Abra uma nova guia. ✨

## Publicar na Chrome Web Store

```bash
cd dist && zip -r ../extension.zip . && cd ..
```

Envie o `extension.zip` no [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

Na ficha de publicação, justifique as permissões:

| Permissão | Justificativa |
|---|---|
| `storage` | Salvar preferências, temas, tarefas, notas e eventos do usuário. |
| `geolocation` | Widget de clima (localização local, nunca enviada a terceiros além da API de clima). |
| `bookmarks` | Sugestões de favoritos na barra de busca. |
| `topSites` | Preencher os links rápidos iniciais. |
| `scripting` + `<all_urls>` | Controle de mídia da Ilha Dinâmica: play/pause/next na aba que está tocando áudio (YouTube, Spotify Web, etc.). |
| `clipboardRead` | Ferramenta de tradução da Ilha Dinâmica (ler texto copiado quando o usuário pede). |
| Content script `<all_urls>` | Exibe a Ilha Dinâmica flutuante nas páginas (overlay em Shadow DOM, sem ler dados da página). |

## Chave de API do Gemini

Os recursos de IA (chat, frases, horóscopo, insights) usam a chave **que o usuário informa nas Configurações** da própria extensão. A chave fica no `chrome.storage.local` do dispositivo e nunca é sincronizada nem embutida no pacote.

## Desenvolvimento web (sem extensão)

```bash
npm run dev
```

O app roda como página web comum — as APIs `chrome.*` têm fallback para `localStorage`.
