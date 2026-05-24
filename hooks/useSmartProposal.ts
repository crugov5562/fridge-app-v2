import { useQuery } from '@tanstack/react-query';
import { recipes } from '@/lib/api';

export function useSmartProposal(fridgeId: string | null) {
  return useQuery({
    queryKey: ['smart-proposal', fridgeId],
    queryFn: () => recipes.smartProposal(fridgeId!),
    enabled: !!fridgeId,
    // пересчитываем не чаще раза в 10 минут — GPT-вызов дорогой
    staleTime: 10 * 60 * 1000,
    // не повторять при ошибке бесконечно
    retry: 1,
  });
}
