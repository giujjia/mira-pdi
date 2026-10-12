import { describe, expect, it } from 'vitest';
import { explainPixel } from '../src/education/explainer';
import { sobelFilter, robertsFilter, kirschFilter } from '../src/core/edges';
import { laplacianSharpen } from '../src/core/sharpening';
import { createKernel, convolve2D } from '../src/core/convolution';
import { signedDisplay } from '../src/core/display';
import { GrayImage } from '../src/core/types';
const img: GrayImage = {width:3,height:3,data:Float32Array.from([1,2,3,4,5,6,7,8,9])};
describe('respostas e explicações selecionadas', () => {
  it('Sobel usa convolução: Gx=-8, Gy=24 no centro', () => {
    expect(explainPixel(img,1,1,'sobel',{component:'gx'}).valRaw).toBe(-8);
    expect(explainPixel(img,1,1,'sobel',{component:'gy'}).valRaw).toBe(24);
  });
  for (const border of ['zeros','replication'] as const) {
    it(`todas as componentes coincidem com o núcleo, inclusive bordas: ${border}`, () => {
      const sobel = sobelFilter(img,border), roberts = robertsFilter(img,border), kirsch = kirschFilter(img,border);
      for (let y=0;y<3;y++) for(let x=0;x<3;x++) {
        const i=y*3+x;
        for(const component of ['gx','gy','magnitude'] as const) expect(explainPixel(img,x,y,'sobel',{component},border).valRaw).toBeCloseTo(sobel[component].data[i],4);
        for(const component of ['r1','r2','magnitude'] as const) expect(explainPixel(img,x,y,'roberts',{component},border).valRaw).toBeCloseTo(roberts[component].data[i],4);
        for(let k=0;k<8;k++) expect(explainPixel(img,x,y,'kirsch',{component:String(k)},border).valRaw).toBe(kirsch.directionResponses[k].data[i]);
        expect(explainPixel(img,x,y,'kirsch',{component:'max'},border).valRaw).toBe(kirsch.maxResponse.data[i]);
        for(const mode of ['centerNegative','centerPositive'] as const) {
          const sharp=laplacianSharpen(img,mode,border);
          for(const component of ['original','laplacian','result'] as const) expect(explainPixel(img,x,y,'sharpenLaplacian',{mode,component},border).valRaw).toBe((component==='original'?img:sharp[component]).data[i]);
        }
      }
    });
    it(`máscara 2×3 assimétrica e âncora deslocada: ${border}`, () => {
      const kernel=createKernel([[1,2,3],[-1,0,4]],2,0);
      const output=convolve2D(img,kernel,-7,border);
      for(let y=0;y<3;y++) for(let x=0;x<3;x++) {
        const e=explainPixel(img,x,y,'convolution',{kernel,offset:-7},border);
        expect(e.valRaw).toBe(output.data[y*3+x]);
        expect(e.neighborhoodRows).toBe(2); expect(e.neighborhoodCols).toBe(3);
        expect(e.anchorX).toBe(0); expect(e.anchorY).toBe(1);
        expect(e.neighbors.reduce((sum,v,i)=>sum+v*e.kernelWeights![Math.floor(i/3)][i%3],-7)).toBe(e.valRaw);
      }
    });
  }
  it('Roberts usa vizinhança 2×2 e âncora rotacionada (1,1)',()=>{
    const e=explainPixel(img,1,1,'roberts',{component:'r1'});
    expect(e.neighbors).toEqual([1,2,4,5]);
    expect(e.kernelWeights).toEqual([[0,-1],[1,0]]);
    expect(e.valRaw).toBe(2);
  });
  it('visualização com sinal preserva os dados e mapeia zero para cinza',()=>{
    const input={width:3,height:1,data:Float32Array.from([-20,0,20])};
    expect(Array.from(signedDisplay(input).image.data)).toEqual([0,127.5,255]);
    expect(Array.from(input.data)).toEqual([-20,0,20]);
    expect(signedDisplay({width:1,height:1,data:new Float32Array(1)}).image.data[0]).toBe(127.5);
  });
});
