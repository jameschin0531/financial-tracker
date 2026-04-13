import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import { getAssetAllocation } from '../../services/calculations';
import AllocationDonutChart from './AllocationDonutChart';

const AssetAllocationChart: React.FC = () => {
  const { data } = useFinancialData();
  const [allocation, setAllocation] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    const loadAllocation = async () => {
      const a = await getAssetAllocation(data.assets, data.stockHoldings, data.cryptoHoldings);
      setAllocation(a);
    };
    loadAllocation();
  }, [data.assets, data.stockHoldings, data.cryptoHoldings]);

  return <AllocationDonutChart allocation={allocation} emptyMessage="Add assets to see allocation" />;
};

export default AssetAllocationChart;
