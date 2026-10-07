export function mapAuthError(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'El correo no es válido.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Correo o contraseña incorrectos.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada. Contacta con soporte.';
    case 'auth/email-already-in-use':
      return 'Ese correo ya tiene una cuenta.';
    case 'auth/weak-password':
      return 'La contraseña no cumple los requisitos de seguridad.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa internet e inténtalo de nuevo.';
    case 'auth/too-many-requests':
      return 'Hubo demasiados intentos. Espera un momento e inténtalo de nuevo.';
    case 'auth/operation-not-allowed':
      return 'El acceso con correo y contraseña no está habilitado en Firebase.';
    default:
      return 'No se pudo completar el acceso. Inténtalo otra vez.';
  }
}
