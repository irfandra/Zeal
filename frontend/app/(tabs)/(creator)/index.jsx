import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { brandService } from '@/services/brandService';

export default function CreatorIndex() {
  const [targetRoute, setTargetRoute] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const resolveTargetRoute = async () => {
      const hasBrand = await brandService.hasCreatorBrand().catch(() => false);
      if (!isMounted) {
        return;
      }

      setTargetRoute(
        hasBrand
          ? '/(tabs)/(creator)/(tabs)/collection'
          : '/(tabs)/(creator)/register-company'
      );
    };

    resolveTargetRoute();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!targetRoute) {
    return null;
  }

  return <Redirect href={targetRoute} />;
}
