# Política de Privacidade

Última atualização: 22/10/2026

A extensão "< Chris /> - Liquid Glass Extension" (Dynamic Glass) substitui a página de nova guia e exibe uma ilha dinâmica nas páginas visitadas. Não existe servidor próprio: nada do que você faz na extensão é enviado a nós, vendido ou compartilhado.

## Onde seus dados ficam

Configurações, tarefas, notas, eventos, atalhos e preferências ficam apenas no `chrome.storage` (sync e local) do seu navegador. Com o sync ativo, o próprio Chrome pode sincronizá-los entre seus dispositivos, conforme sua conta Google.

## Serviços de terceiros usados

- Clima: a geolocalização do navegador (só com sua permissão) é enviada à Open-Meteo para obter o clima.
- Cidade: ipapi.co e api.bigdatacloud.net são consultados para descobrir a cidade aproximada.
- Gemini: a chave de API informada por você fica somente no armazenamento local do navegador. Ela é enviada apenas à API do Google (generativelanguage.googleapis.com), junto com o texto que você pede para processar.
- Sugestões de busca (suggestqueries.google.com), ícones de sites (t2.gstatic.com), avatares (ui-avatars.com), imagens e fontes (Unsplash, Google Fonts) e os recursos visuais dos fundos animados (Unicorn Studio) são carregados de seus respectivos servidores.
- Arquivos `.ics`: baixados da URL que você mesmo informa no calendário.

## O que a extensão lê

- Favoritos e sites mais visitados: lidos só para exibir atalhos.
- Área de transferência: lida apenas quando você aciona a ferramenta correspondente.
- Câmera e microfone: usados somente quando você aciona a ferramenta correspondente na ilha.
- Mídia: controle de play/pause na aba que está tocando áudio ou vídeo.
- Páginas visitadas: o content script apenas desenha a ilha dinâmica; não coleta, lê nem transmite o conteúdo das páginas.

## Permissões e por quê

- `storage`: salvar suas configurações e dados no navegador.
- `geolocation`: obter sua localização para o clima.
- `bookmarks`: listar favoritos como atalhos.
- `topSites`: listar sites mais visitados como atalhos.
- `scripting`: executar play/pause na aba que está tocando mídia.
- `clipboardRead`: colar o conteúdo da área de transferência na ferramenta quando você aciona.
- `host_permissions` (`<all_urls>`): exibir a ilha dinâmica em qualquer página, acessar a aba com mídia para controlá-la, e buscar APIs de clima, cidade e Gemini e arquivos `.ics` de URLs informadas por você.
- Content script (`<all_urls>`): desenhar a ilha dinâmica nas páginas.

## Seus direitos

Para apagar seus dados, remova a extensão ou limpe os dados dela em chrome://extensions. Como não temos servidor, não mantemos cópia de nada seu.
