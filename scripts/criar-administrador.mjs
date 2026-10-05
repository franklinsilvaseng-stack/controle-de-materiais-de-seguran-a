import bcrypt from "bcryptjs";

const email = process.env.CONTROLEEPI_EMAIL?.trim().toLowerCase();
const senha = process.env.CONTROLEEPI_SENHA ?? "";
const nome = process.env.CONTROLEEPI_NOME?.trim() || "Administrador";
if (!email || !senha) {
  console.error("Defina CONTROLEEPI_EMAIL, CONTROLEEPI_SENHA e, se quiser, CONTROLEEPI_NOME. A saída é SQL para colar no hub. Não salve a senha no projeto.");
  process.exit(1);
}
if (senha.length < 8 || !/[A-Za-zÀ-ÿ]/.test(senha) || !/\d/.test(senha)) {
  console.error("A senha precisa ter 8 caracteres, com letra e número.");
  process.exit(1);
}
const hash = bcrypt.hashSync(senha, 10);
const empresa = crypto.randomUUID();
const conta = crypto.randomUUID();
console.log(`insert into controleepi.companies (id, name) values ('${empresa}', 'Empresa principal');
insert into controleepi.accounts (id, email, password_hash) values ('${conta}', '${email.replaceAll("'", "''")}', '${hash}');
insert into controleepi.profiles (account_id, company_id, full_name, email, role, pode_ver_custos) values ('${conta}', '${empresa}', '${nome.replaceAll("'", "''")}', '${email.replaceAll("'", "''")}', 'administrador', true);
insert into controleepi.licenses (account_id, company_id, status, plan, expires_at) values ('${conta}', '${empresa}', 'active', 'vitalicia', null);`);
