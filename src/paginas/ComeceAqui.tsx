import { BRAND } from "../brand";

export function ComeceAqui({ instalar }: { instalar: () => void }) {
  return (
    <section className="cartao">
      <h2 className="titulo">Comece Aqui</h2>
      <p>Este controle é o estoque de EPI da segurança do trabalho. A requisição de compra continua no almoxarifado central. Aqui o técnico guarda o número dessa requisição, a nota fiscal e as entregas da obra.</p>
      <ol>
        <li>Cadastre a obra com a data de início. Cada obra tem o próprio estoque.</li>
        <li>Cadastre os colaboradores com a função, por exemplo Pedreiro.</li>
        <li>Cadastre somente EPIs. Se o item protege a audição, marque abafador ou plug.</li>
        <li>Lance a entrada com quantidade, número da requisição, número da NF e o valor da nota.</li>
        <li>Na entrega, escolha o colaborador e oriente a assinatura da Ficha de EPI.</li>
        <li>O CA vencido apenas avisa. A entrega pode seguir.</li>
        <li>Consulte avisos, média de troca, ranking e, se você tiver autorização, o custo por colaborador.</li>
      </ol>
      {BRAND.youtubeComeceAqui ? <p><a href={BRAND.youtubeComeceAqui}>Assistir ao vídeo de orientação</a></p> : null}
      <button className="botao" type="button" onClick={instalar}>Instalar App</button>
    </section>
  );
}
