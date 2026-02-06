import React from 'react';
import { FamilyProvider } from './context/FamilyContext';
import InfiniteBoard from './components/Board/InfiniteBoard';

function App() {
  return (
    <FamilyProvider>
      <InfiniteBoard />
    </FamilyProvider>
  );
}

export default App;
