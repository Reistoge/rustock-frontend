// A parsed `TicksResponse`, ready for uPlot's `AlignedData` ([times, ticks]).
export interface Trajectory {
  simulationId: string;
  times: Float64Array;
  ticks: Float64Array;
  timeHorizon: number;
  steps: number;
  min: number;
  max: number;
}

export type TrajectoryStatus = 'idle' | 'loading' | 'error' | 'ready';

export interface TrajectoryError {
  title: string;
  body: string;
}

// Messages per HTTP status (HANDOFF.md §5).
export function trajectoryError(status: number | null): TrajectoryError {
  switch (status) {
    case 413:
      return {
        title: 'Trayectoria demasiado grande (413)',
        body: 'El servidor no puede devolver tantos ticks. Reduce los pasos e intenta de nuevo.',
      };
    case 404:
      return {
        title: 'Simulación no encontrada (404)',
        body: 'Puede que se haya eliminado. Actualiza el historial.',
      };
    case 400:
      return {
        title: 'Parámetros inválidos (400)',
        body: 'El servidor rechazó los parámetros de esta simulación.',
      };
    default:
      return {
        title: 'No se pudo cargar la trayectoria',
        body: 'Revisa tu conexión e inténtalo otra vez.',
      };
  }
}
