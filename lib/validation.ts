const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ' .-]+$/;

export function validateEmail(value: string) {
  const email = value.trim();
  if (!email) {
    return 'Ingresa tu correo electrónico.';
  }
  if (!EMAIL_PATTERN.test(email)) {
    return 'Ese correo no parece válido.';
  }
  return undefined;
}

export function validateName(value: string) {
  const name = value.trim();
  if (!name) {
    return 'Ingresa tu nombre.';
  }
  if (name.length < 2) {
    return 'El nombre es muy corto.';
  }
  if (name.length > 60) {
    return 'Usa máximo 60 caracteres.';
  }
  if (!NAME_PATTERN.test(name)) {
    return 'Usa solo letras y espacios.';
  }
  return undefined;
}
