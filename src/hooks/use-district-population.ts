import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { populationQuery } from '../lib/data';
import { normalize } from '../lib/geo';

export function useDistrictPopulation(district: string | undefined) {
  const { data } = useQuery({ ...populationQuery, enabled: Boolean(district) });
  return useMemo(
    () => (district ? data?.find((row) => normalize(row.district) === normalize(district)) : undefined),
    [data, district],
  );
}
