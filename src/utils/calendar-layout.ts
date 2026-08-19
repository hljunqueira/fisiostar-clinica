import { Session } from '../../types';

export interface LayoutEvent {
  session: Session;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
  colIndex: number;
  totalColumns: number;
  zIndex: number;
}

/**
 * Converte "HH:MM" para minutos a partir da meia-noite
 */
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

/**
 * Calcula layout de sobreposição em cascata inteligente (estilo moderno) para eventos do mesmo dia.
 * @param sessions Lista de sessões do dia
 * @param startHour Hora inicial da grade do calendário (ex: 7 para 07:00)
 * @param hourHeight Altura de cada bloco de hora em pixels (padrão: 60px)
 * @param isWeekView Define se é a visão semanal (espaço mais compacto) ou diária
 */
export const calculateOverlappingLayout = (
  sessions: Session[],
  startHour: number = 7,
  hourHeight: number = 60,
  isWeekView: boolean = true
): Map<string, LayoutEvent> => {
  const layoutMap = new Map<string, LayoutEvent>();
  if (!sessions || sessions.length === 0) return layoutMap;

  // 1. Extrair intervalos de tempo normalizados
  interface IntervalItem {
    session: Session;
    start: number;
    end: number;
  }

  const items: IntervalItem[] = sessions.map((s) => {
    const start = timeToMinutes(s.time);
    let end: number;

    if (s.endTime) {
      end = timeToMinutes(s.endTime);
      if (end <= start) {
        end = start + (s.duration || 60);
      }
    } else {
      end = start + (s.duration || 60);
    }

    // Garante duração mínima visível de 30 minutos
    if (end - start < 30) {
      end = start + 30;
    }

    return { session: s, start, end };
  });

  // Ordena por horário de início (e por duração decrescente se iniciarem juntos)
  items.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  // 2. Agrupar em clusters / componentes conexos de eventos sobrepostos
  const clusters: IntervalItem[][] = [];
  let currentCluster: IntervalItem[] = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.end;
    } else if (item.start < clusterEnd) {
      // Sobrepõe com o cluster atual
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    } else {
      // Inicia novo cluster
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 3. Para cada cluster, distribuir em colunas paralelas / cascata
  for (const cluster of clusters) {
    const columns: IntervalItem[][] = [];

    for (const item of cluster) {
      let placed = false;

      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const lastInCol = columns[colIdx][columns[colIdx].length - 1];
        // Se o último evento nessa coluna já terminou antes do início deste item, podemos reutilizar a coluna
        if (lastInCol.end <= item.start) {
          columns[colIdx].push(item);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([item]);
      }
    }

    const totalColumns = columns.length;

    // 4. Calcular top, height, left, width para cada item
    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      for (const item of columns[colIndex]) {
        const startMin = item.start;
        const durationMin = item.end - item.start;

        const top = (startMin - startHour * 60) * (hourHeight / 60);
        const height = Math.max(34, durationMin * (hourHeight / 60) - 2);

        let leftPercent: number;
        let widthPercent: number;

        if (isWeekView) {
          if (totalColumns === 1) {
            leftPercent = 0;
            widthPercent = 100;
          } else if (totalColumns === 2) {
            leftPercent = colIndex * 50;
            widthPercent = 50;
          } else {
            // Efeito Cascata Inteligente para 3+ eventos na semana:
            // Cada card mantém largura confortável (65% da coluna) com deslocamento gradual
            const cardWidth = Math.max(55, 100 - (totalColumns - 1) * 11);
            const step = (100 - cardWidth) / (totalColumns - 1);
            leftPercent = colIndex * step;
            widthPercent = cardWidth;
          }
        } else {
          // Visão Diária: Mais espaço horizontal
          if (totalColumns <= 4) {
            leftPercent = (colIndex * 100) / totalColumns;
            widthPercent = 100 / totalColumns;
          } else {
            const cardWidth = Math.max(28, 100 / totalColumns);
            leftPercent = (colIndex * 100) / totalColumns;
            widthPercent = cardWidth;
          }
        }

        layoutMap.set(item.session.id, {
          session: item.session,
          top,
          height,
          leftPercent,
          widthPercent,
          colIndex,
          totalColumns,
          zIndex: 10 + colIndex
        });
      }
    }
  }

  return layoutMap;
};
