import React, { useMemo, useState } from 'react';
import { SLIDES } from '../education/slides';
import { createImage, quantize } from '../core/matrix';
import {
  negative,
  threshold,
  contrastStretching,
  gammaTransform,
  logTransform
} from '../core/pointwise';
import { meanFilter, medianFilter, adaptiveContrast } from '../core/spatial';
import {
  sobelFilter,
  robertsFilter,
  kirschFilter,
  laplacianFilter
} from '../core/edges';
import { laplacianSharpen, highBoostFilter } from '../core/sharpening';
import { histogramEqualization } from '../core/histogram';
import { dissolveUniform } from '../core/dissolve';
import { convolve2D, createKernel } from '../core/convolution';

interface TeachingSlideProps {
  topic: string;
}

export const TeachingSlide: React.FC<TeachingSlideProps> = ({ topic }) => {
  const [r, setR] = useState(200);
  const slide = SLIDES[topic];

  const { raw, values } = useMemo(() => {
    const img = createImage(3, 3);
    img.data.set([10, 20, 30, 20, r, 40, 30, 40, 60]);
    let out = img;

    switch (topic) {
      case 'negative':
        out = negative(img);
        break;
      case 'threshold':
        out = threshold(img, 128);
        break;
      case 'stretching':
        out = contrastStretching(img, 0, 255);
        break;
      case 'gamma':
        out = gammaTransform(img, 0.5, 1);
        break;
      case 'log':
        out = logTransform(img);
        break;
      case 'mean':
        out = meanFilter(img, 3);
        break;
      case 'median':
        out = medianFilter(img, 3);
        break;
      case 'adaptive':
        out = adaptiveContrast(img, 3, 20);
        break;
      case 'histogram':
        out = histogramEqualization(img).result;
        break;
      case 'dissolve':
        out = dissolveUniform(img, createImage(3, 3, 200), 0.5);
        break;
      case 'sobel':
        out = sobelFilter(img).magnitude;
        break;
      case 'roberts':
        out = robertsFilter(img).magnitude;
        break;
      case 'kirsch':
        out = kirschFilter(img).maxResponse;
        break;
      case 'laplacian':
        out = laplacianFilter(img);
        break;
      case 'sharpen':
        out = laplacianSharpen(img).result;
        break;
      case 'highBoost':
        out = highBoostFilter(img, 1.5, 3).result;
        break;
      case 'convolution':
      case 'mandatory':
        out = convolve2D(
          img,
          createKernel([
            [-1, -1, -1],
            [-1,  9, -1],
            [-1, -1, -1]
          ])
        );
        break;
      default:
        out = img;
    }

    return { raw: out.data[4], values: Array.from(img.data) };
  }, [topic, r]);

  if (!slide) return null;

  const isPointOperation = ['negative', 'threshold', 'gamma', 'log', 'dissolve'].includes(topic);

  let calculation = `Resposta no centro: ${Number(raw.toFixed(3))}`;
  if (topic === 'negative') {
    calculation = `255 − ${r} = ${raw}`;
  } else if (topic === 'mean') {
    calculation = `(250 + ${r}) ÷ 9 = ${raw.toFixed(2)}`;
  } else if (topic === 'median') {
    calculation = `Ordenação: ${[...values].sort((a, b) => a - b).join(', ')} → 5º valor: ${raw}`;
  } else if (topic === 'threshold') {
    calculation = `${r} ${r >= 128 ? '≥' : '<'} 128 → ${raw}`;
  } else if (topic === 'dissolve') {
    calculation = `0,5 × ${r} + 0,5 × 200 = ${raw}`;
  }

  return (
    <section className="teaching-slide" aria-label="Explicação interativa">
      <div className="teaching-copy">
        <p className="teaching-kicker">ENTENDA A IDEIA</p>
        <h2>{slide.title}</h2>
        <p>{slide.text}</p>
        <div className="teaching-formula">{slide.formula}</div>
        <p className="teaching-symbols">{slide.symbols}</p>
        <aside>
          <strong>O que observar</strong>
          <p>{slide.observe}</p>
        </aside>
      </div>

      <div className="teaching-demo">
        <h3>Veja nos números</h3>
        <p className="teaching-demo-note">
          Exemplo didático independente da imagem abaixo. Os parâmetros deste exemplo são os descritos ao lado.
        </p>

        {!isPointOperation && (
          <div className="teaching-grid" aria-label="Matriz de exemplo 3 por 3">
            {values.map((v, i) => (
              <span
                key={i}
                style={{
                  background: `rgb(${v},${v},${v})`,
                  color: v > 140 ? '#111' : '#fff',
                  outline: i === 4 ? '2px solid #00875a' : undefined
                }}
              >
                {v}
              </span>
            ))}
          </div>
        )}

        <label htmlFor="example-intensity">
          {isPointOperation ? 'Intensidade de entrada r' : 'Intensidade do pixel central'}{' '}
          <strong>{r}</strong>
        </label>
        <input
          id="example-intensity"
          type="range"
          min={0}
          max={255}
          value={r}
          onChange={(e) => setR(Number(e.target.value))}
        />
        <div className="teaching-scale">
          <span>0 · preto</span>
          <span>255 · branco</span>
        </div>

        <div className="teaching-calculation" aria-live="polite">
          {calculation}
        </div>

        <div className="teaching-output">
          <span
            style={{
              background: `rgb(${quantize(raw)},${quantize(raw)},${quantize(raw)})`
            }}
          />
          <div>
            <small>Tom resultante em 8 bits</small>
            <strong>{quantize(raw)}</strong>
          </div>
        </div>

        {(raw < 0 || raw > 255) && (
          <p className="teaching-demo-note">
            O cálculo resulta em {Number(raw.toFixed(2))}. Para mostrar em 8 bits, limitamos a {quantize(raw)}.
          </p>
        )}
      </div>
    </section>
  );
};
