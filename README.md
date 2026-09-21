# Kairo Control 4.0

Interface moderna + espelhamento da tela + mouse/toque + teclado + texto + voz + atalhos de aplicativos + modo remoto pela internet.

## O que mudou
- Dashboard moderno responsivo para celular e PC.
- Espelhamento ativável/desativável.
- Tela cheia e orientação paisagem.
- Cursor do Windows sobreposto na posição real.
- Toque/mouse, clique esquerdo/direito, duplo clique e scroll.
- Teclas básicas e envio de texto por entrada Unicode nativa do Windows (sem PowerShell).
- Atalhos seguros para Spotify, Chrome, Discord, Explorador, Bloco de Notas e Calculadora.
- Botão para bloquear o PC.
- Comandos de voz para espelhamento, tela cheia e aplicativos.
- Código temporário para parear o celular.
- Relay opcional: o PC faz conexão de saída com um servidor público e o celular pode entrar de outra rede, sem precisar abrir a porta 3443 do PC.

## Instalação no PC
1. Instale Node.js 20 ou superior.
2. Extraia o ZIP.
3. Abra a pasta e execute `npm install`.
4. Execute `npm run check`.
5. Execute `npm run selftest`.
6. Execute `npm start` ou `start.bat`.
7. Na mesma rede, abra `https://IP_DO_PC:3443`.

O navegador pode mostrar um aviso de certificado porque o HTTPS local usa um certificado autoassinado. Isso é esperado no acesso LAN.

## Firewall LAN
Execute `setup-firewall.bat` como administrador se o celular não conseguir acessar o PC.

## Acesso de qualquer lugar
O ZIP inclui um **Kairo Relay**. Ele é um servidor de encaminhamento: não salva a tela; apenas encaminha mensagens entre o PC e o celular.

### 1. Hospede o relay
O relay é Node.js puro e pode ficar em qualquer servidor que ofereça uma URL pública HTTPS/WSS. No servidor:

```bash
npm install
npm run relay
```

Defina `PORT` se o host fornecer uma porta própria. Em hospedagens gerenciadas, o `PORT` normalmente já é definido pela plataforma.

### 2. Configure o PC
Copie `.env.example` para `.env` e preencha:

```env
KAIRO_RELAY_URL=wss://SEU-RELAY.EXEMPLO
KAIRO_DEVICE_NAME=Meu PC
```

Não compartilhe `KAIRO_RELAY_TOKEN`. O programa cria e guarda um token longo em `data/cloud.json`.

Reinicie o Kairo. O dashboard mostrará **CLOUD ON** e um código temporário de pareamento.

### 3. No celular
Abra a URL HTTPS do relay. Digite o código mostrado no PC e toque em **Conectar**.

O celular e o PC podem estar em redes diferentes. O PC inicia a conexão para o relay, então o usuário não precisa expor diretamente a porta 3443 à internet.

## Segurança
- O código remoto expira e pode ser renovado pelo botão **Gerar novo código**.
- O relay exige o token do agente e o código temporário do controlador.
- Não existe comando de shell arbitrário na interface.
- Os aplicativos remotos são uma lista fechada de programas conhecidos.
- O relay não grava frames em disco.
- Use HTTPS/WSS no relay público.

## Limitações reais
- O espelhamento desta versão usa JPEG periódico, por padrão 6 FPS; não é o mesmo que uma transmissão WebRTC de 60 FPS.
- A captura usa a tela principal do Windows.
- O acesso pela internet depende de você hospedar/configurar o relay público. O ZIP não cria sozinho um servidor público na internet.
- A qualidade e latência variam conforme CPU, Wi-Fi e internet.

## Comandos de voz
Exemplos:
- “Kairo, ativar espelhamento”
- “Kairo, desativar espelhamento”
- “Kairo, tela cheia”
- “Kairo, abrir Spotify”
- “Kairo, abrir Chrome”
- “Kairo, abrir Discord”

## Testes
```bash
npm run check
npm run selftest
```

Esses testes verificam arquivos, sintaxe e presença das funções principais. O funcionamento real de captura/controle precisa ser testado no seu Windows.
