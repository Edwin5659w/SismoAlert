export function mapAuthError(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'El correo no es válido.';
    case 'auth/missing-email':
      return 'Ingresa tu correo electrónico.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Correo o contraseña incorrectos.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada. Contacta con soporte.';
    case 'auth/email-already-in-use':
      return 'Ese correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'La contraseña no cumple los requisitos de seguridad.';
    case 'auth/network-request-failed':
    case 'unavailable':
      return 'Sin conexión. Revisa internet e inténtalo de nuevo.';
    case 'auth/too-many-requests':
      return 'Hubo demasiados intentos. Espera un momento e inténtalo de nuevo.';
    case 'auth/operation-not-allowed':
      return 'El acceso con correo y contraseña no está habilitado en Firebase.';
    case 'permission-denied':
      return 'Firestore rechazó la escritura (revisa las reglas de seguridad).';
    default:
      return 'No se pudo completar la operación. Inténtalo otra vez.';
  }
}
