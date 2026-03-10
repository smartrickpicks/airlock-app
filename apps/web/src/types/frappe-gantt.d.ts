declare module "frappe-gantt" {
  export default class Gantt {
    constructor(
      element: SVGElement,
      tasks: unknown[],
      options?: Record<string, unknown>,
    );
  }
}
