import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Label } from './components/ui/Label';
export type Node = [number, number, number]; // position coordinates [x,y,z]
export type Element = number[]; // indices of the first and 
const meshCache = new Map<string, ReturnType<typeof meshRectangularPlateV2>>();
const coordinatesCache = new Map<string, Node[]>();
const elementsCache = new Map<string, Element[]>();

export function meshRectangularPlateV2(
  L: number,
  B: number,
  Nx: number,
  Ny: number
): {
  coordinates: Node[];
  elements: Element[];
  nel: number;
  nnode: number;
} {
  const cacheKey = `${L}-${B}-${Nx}-${Ny}`;

  if (meshCache.has(cacheKey)) {
    return meshCache.get(cacheKey)!;
  }

  const coordinates = calculateCoordinates(L, B, Nx, Ny);
  const elements = generateElements(Nx, Ny);


  
  // Total number of elements and nodes
  const nel = Nx * Ny;
  const nnode = (Nx + 1) * (Ny + 1);

  const result = { coordinates, elements, nel, nnode };
  
  meshCache.set(cacheKey, result);

  return result;
}

function calculateCoordinates(L: number, B: number, Nx: number, Ny: number) {
  const cacheKey = `${L}-${B}-${Nx}-${Ny}`;
  const cachedCoordinates = coordinatesCache.get(cacheKey);
  if (cachedCoordinates) {
    return cachedCoordinates;
  }

  const coordinates: Node[] = [];
  let bNy = B / Ny;
  for (let i = 0; i <= Nx; i++) {
    let iLx = i * L/Nx;
    for (let j = 0; j<= Ny; j++) {
      coordinates.push([ iLx,  j * bNy, 0]); // Z-coordinate is 0
    }
  }

  coordinatesCache.set(cacheKey, coordinates);
  return coordinates;
}

function generateElements(Nx: number, Ny: number) {
  const cacheKey = `${Nx}-${Ny}`;
  const cachedElements = elementsCache.get(cacheKey);
  if (cachedElements) {
    return cachedElements;
  }

  const elements: Element[] = [];
  
  for (let i = 0; i < Nx; i++) {
    let n1 = i * (Ny + 1);
    for (let j = 0; j < Ny; j++) {
      elements.push([j + n1, j + n1 + Ny + 1, j + n1 + Ny + 2, j + n1 + 1]);
    }
  }

  elementsCache.set(cacheKey, elements);
  return elements;
}

// Optional: Method to clear cache if memory becomes a concern
export function clearMeshCache() {
  meshCache.clear();
}

export function meshRectangularPlate(
  L: number,
  B: number,
  Nx: number,
  Ny: number
): {
  coordinates: Node[];
  elements: Element[];
  nel: number;
  nnode: number;
} {
  // Total number of elements and nodes
  const nel = Nx * Ny;
  const nnode = (Nx + 1) * (Ny + 1);

  // Number of points along X and Y axes
  const npx = Nx + 1;
  const npy = Ny + 1;

  // Discretize the length and breadth
  const nx = Array.from({ length: npx }, (_, i) => (i * L) / Nx);
  const ny = Array.from({ length: npy }, (_, i) => (i * B) / Ny);

  // Create meshgrid arrays
  const xx: number[][] = [];
  const yy: number[][] = [];
  for (let j = 0; j < npy; j++) {
    xx[j] = [];
    yy[j] = [];
    for (let i = 0; i < npx; i++) {
      xx[j][i] = nx[i];
      yy[j][i] = ny[j];
    }
  }

  // Flatten the meshgrid arrays column-wise to create the coordinates array
  const coordinates: Node[] = [];
  for (let i = 0; i < npx; i++) {
    for (let j = 0; j < npy; j++) {
      coordinates.push([xx[j][i], yy[j][i], 0]); // Z-coordinate is 0
    }
  }

  // Create the NodeNo array to assign node numbers
  const NodeNo: number[][] = [];
  let nodeCounter = 0;
  for (let i = 0; i < npx; i++) {
    for (let j = 0; j < npy; j++) {
      if (!NodeNo[j]) NodeNo[j] = [];
      NodeNo[j][i] = nodeCounter++;
    }
  }

  // Generate element connectivity matching MATLAB's node ordering
  const elements: Element[] = [];
  for (let i = 0; i < npx - 1; i++) {
    for (let j = 0; j < npy - 1; j++) {
      const n1 = NodeNo[j][i];
      const n2 = NodeNo[j][i + 1];
      const n3 = NodeNo[j + 1][i + 1];
      const n4 = NodeNo[j + 1][i];
      elements.push([n1, n2, n3, n4]);
    }
  }


  return { coordinates, elements, nel, nnode };
}
function compareMeshResults(
  meshV2: ReturnType<typeof meshRectangularPlateV2>, 
  meshOriginal: ReturnType<typeof meshRectangularPlate>
): boolean {
  // Compare number of elements and nodes
  if (meshV2.nel !== meshOriginal.nel || meshV2.nnode !== meshOriginal.nnode) {
    console.error('Mismatch in total elements or nodes');
    return false;
  }

  // Compare coordinates
  if (meshV2.coordinates.length !== meshOriginal.coordinates.length) {
    console.error('Mismatch in coordinates length');
    return false;
  }

  for (let i = 0; i < meshV2.coordinates.length; i++) {
    const coordV2 = meshV2.coordinates[i];
    const coordOriginal = meshOriginal.coordinates[i];
    
    // Allow small floating point differences
    if (
      Math.abs(coordV2[0] - coordOriginal[0]) > 1e-10 ||
      Math.abs(coordV2[1] - coordOriginal[1]) > 1e-10 ||
      Math.abs(coordV2[2] - coordOriginal[2]) > 1e-10
    ) {
      console.log(coordV2, coordOriginal);
      console.error(`Coordinate mismatch at index ${i}`);
      return false;
    }
  }

  // Compare elements
  if (meshV2.elements.length !== meshOriginal.elements.length) {
    console.error('Mismatch in elements length');
    return false;
  }

  for (let i = 0; i < meshV2.elements.length; i++) {
    const elementV2 = meshV2.elements[i];
    const elementOriginal = meshOriginal.elements[i];
    
    if (!elementV2.every((node, j) => node === elementOriginal[j])) {
      console.log(elementV2, elementOriginal);
      console.error(`Element mismatch at index ${i}`);
      return false;
    }
  }

  return true;
}

const MeshBenchmarkApp = () => {
  const [params, setParams] = useState({
    L: 1,
    B: 1,
    Nx: 20,
    Ny: 30
  });

  const [benchmarkResults, setBenchmarkResults] = useState<{
    v2Time: string;
    originalTime: string;
    v2Nodes: number | null;
    originalNodes: number | null;
    v2Elements: number | null;
    originalElements: number | null;
    originalOverV2: string | null;
    resultsMatch: boolean | null;
  }>({
    v2Time: '',
    originalTime: '',
    v2Nodes: null,
    originalNodes: null,
    v2Elements: null,
    originalElements: null,
    originalOverV2: null,
    resultsMatch: null
  });

  const handleParamChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const runBenchmark = () => {
    const startV2 = performance.now();
    const meshV2 = meshRectangularPlateV2(params.L, params.B, params.Nx, params.Ny);
    const endV2 = performance.now();

    const startOriginal = performance.now();
    const meshOriginal = meshRectangularPlate(params.L, params.B, params.Nx, params.Ny);
    const endOriginal = performance.now();

    const resultsMatch = compareMeshResults(meshV2, meshOriginal);

    setBenchmarkResults({
      v2Time: (endV2 - startV2).toFixed(4),
      originalTime: (endOriginal - startOriginal).toFixed(4),
      v2Nodes: meshV2.nnode,
      originalNodes: meshOriginal.nnode,
      v2Elements: meshV2.nel,
      originalElements: meshOriginal.nel,
      originalOverV2: ((endOriginal - startOriginal) / (endV2 - startV2)).toFixed(2),
      resultsMatch
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Mesh Generation Benchmark</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Length (L)</Label>
              <Input 
                type="number" 
                name="L" 
                value={params.L} 
                onChange={handleParamChange}
                step="0.1"
              />
            </div>
            <div>
              <Label>Breadth (B)</Label>
              <Input 
                type="number" 
                name="B" 
                value={params.B} 
                onChange={handleParamChange}
                step="0.1"
              />
            </div>
            <div>
              <Label>X Divisions (Nx)</Label>
              <Input 
                type="number" 
                name="Nx" 
                value={params.Nx} 
                onChange={handleParamChange}
              />
            </div>
            <div>
              <Label>Y Divisions (Ny)</Label>
              <Input 
                type="number" 
                name="Ny" 
                value={params.Ny} 
                onChange={handleParamChange}
              />
            </div>
          </div>
          <Button onClick={runBenchmark} className="w-full">
            Run Benchmark
          </Button>
          {benchmarkResults.v2Time && (
            <div className="bg-gray-100 p-4 rounded-md">
              <h3 className="font-bold mb-2">Benchmark Results</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <strong>V2 Method:</strong>
                  <p>Time: {benchmarkResults.v2Time} ms</p>
                  <p>Nodes: {benchmarkResults.v2Nodes}</p>
                  <p>Elements: {benchmarkResults.v2Elements}</p>
                </div>
                <div>
                  <strong>Original Method:</strong>
                  <p>Time: {benchmarkResults.originalTime} ms</p>
                  <p>Nodes: {benchmarkResults.originalNodes}</p>
                  <p>Elements: {benchmarkResults.originalElements}</p>
                </div>
                <div>
                  <strong>Original Over V2:</strong>
                  <p>{benchmarkResults.originalOverV2}x</p>
                  <p>{benchmarkResults.resultsMatch ? 'Results match' : 'Results do not match'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MeshBenchmarkApp;