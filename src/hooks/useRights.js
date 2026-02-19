import useAuthStore from '@/stores/useAuthStore';

function hasPermissionImpl(Permission, name) {
  return (
    (Array.isArray(Permission) ? Permission : [Permission]).findIndex(
      (s) => s === name || s?.startsWith(`${name}:`)
    ) >= 0
  );
}

export default () => {
  const authStore = useAuthStore();
  return {
    isAuthenticated: () => authStore.isAuthenticated(),
    hasPermission: (name) =>
      authStore.session ? hasPermissionImpl(authStore.session.permissions, name) : false,
    isRole: (role) => authStore.session.role === role,
  };
};
