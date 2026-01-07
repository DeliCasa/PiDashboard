/**
 * Config Hooks
 * React Query hooks for configuration management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi } from '@/infrastructure/api/config';
import { queryKeys } from '@/lib/queryClient';

/**
 * Hook for fetching configuration entries
 */
export function useConfig(enabled = true) {
  return useQuery({
    queryKey: queryKeys.configList(),
    queryFn: configApi.get,
    enabled,
    staleTime: 60000, // Config doesn't change often
  });
}

/**
 * Hook for updating a configuration value
 */
export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      configApi.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configList() });
    },
    // Optimistic update for better UX
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.configList() });
      const previousConfig = queryClient.getQueryData(queryKeys.configList());

      queryClient.setQueryData(queryKeys.configList(), (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((entry) =>
          entry.key === key ? { ...entry, value } : entry
        );
      });

      return { previousConfig };
    },
    onError: (_, __, context) => {
      if (context?.previousConfig) {
        queryClient.setQueryData(queryKeys.configList(), context.previousConfig);
      }
    },
  });
}

/**
 * Hook for resetting a configuration value to default
 */
export function useResetConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => configApi.reset(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configList() });
    },
  });
}
