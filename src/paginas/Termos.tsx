import { useState } from "react";
import { BRAND } from "../brand";

export function Termos({ aceitar }: { aceitar?: () => Promise<void> }) {
  const [marcado, setMarcado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function confirmar() {
    if (!aceitar) return;
    setEnviando(true);
    setErro("");
    try {
      await aceitar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível registrar o aceite.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article className="cartao">
      <h2 className="titulo">Termos de Uso, Licença e Privacidade</h2>
      <p>Controle EPI · Planilha Profissional · Última atualização: setembro de 2026</p>
      <h3>1. Licença de uso</h3>
      <p>O Controle EPI é licenciado de forma não exclusiva, pessoal e intransferível pela planilhaprofissional.com. Não transfere propriedade intelectual. O acesso fica vinculado ao e-mail liberado, com senha própria deste aplicativo.</p>
      <h3>2. Permitido</h3>
      <p>Usar em dispositivos pessoais; cadastrar, editar e consultar os próprios dados; exportar cópias para uso próprio; instalar o aplicativo; consultar o Comece Aqui e estes termos.</p>
      <h3>3. Não permitido</h3>
      <p>Revender, sublicenciar ou distribuir; copiar código, layout, marca, prompts ou metodologia; remover créditos e rodapé; compartilhar acesso; publicar o produto sem autorização; uso comercial em consultoria sem licença específica.</p>
      <h3>4. Sanções</h3>
      <p>Cancelamento da licença sem reembolso, bloqueio em atualizações e medidas da Lei nº 9.610/98.</p>
      <h3>5. Privacidade (LGPD — Lei nº 13.709/2018)</h3>
      <p>Tratamos e-mail, nome, matrícula, função e os lançamentos de EPI que você cadastrar. Os dados ficam na nuvem, privados, para login e para o controle da obra. Não vendemos dados para marketing. O custo por colaborador aparece só para o administrador e para quem ele autorizar. Você pode pedir acesso, correção, exclusão e portabilidade pelo contato abaixo.</p>
      <h3>6. Garantias e limitação de responsabilidade</h3>
      <p>O Controle EPI é fornecido como está, como ferramenta de organização. Não substitui assessoria jurídica, contábil ou de segurança do trabalho. A precisão dos saldos, custos e médias depende dos dados lançados. A Planilha Profissional não se responsabiliza por decisões tomadas com base nesses dados.</p>
      <h3>7. Propriedade intelectual</h3>
      <p>Os dados inseridos continuam do usuário. Código, layout, marca, prompts, paleta e método pertencem à Planilha Profissional.</p>
      <h3>8. Aceite</h3>
      <p>Ao usar o Controle EPI, o usuário concorda com estes termos.</p>
      <h3>9. Contato</h3>
      <p>WhatsApp {BRAND.whatsappDisplay} · {BRAND.supportEmail} · planilhaprofissional.com</p>
      {aceitar ? (
        <div className="grade">
          <label className="campo">
            <span><input type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} /> Li e aceito os termos</span>
          </label>
          {erro ? <p className="erro">{erro}</p> : null}
          <button className="botao" type="button" disabled={!marcado || enviando} onClick={confirmar}>Continuar</button>
        </div>
      ) : null}
    </article>
  );
}
