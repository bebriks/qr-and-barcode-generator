export interface BarcodeModule {
    width: number;
    isBar: boolean;
  }
  
  export function generateCode128Pattern(data: string): BarcodeModule[] {
    // This is a simplified implementation and only work for numeric data.
    const startCode = [
        { width: 2, isBar: true }, // Start C
        { width: 2, isBar: false },
        { width: 2, isBar: true },
        { width: 2, isBar: false },
        { width: 2, isBar: true },
        { width: 2, isBar: true },
        { width: 2, isBar: false },
    ]
      const stopCode = [
          { width: 2, isBar: true }, // Stop
          { width: 2, isBar: false },
          { width: 2, isBar: true },
          { width: 2, isBar: true },
          { width: 2, isBar: false },
          { width: 2, isBar: true },
          { width: 2, isBar: false },
        ];
      const codePattern = data.split('').map(Number).map( digit => {
          switch (digit)
          {
              case 0:
                return [
                    {width: 2, isBar: true},
                    {width: 2, isBar: false},
                    {width: 1, isBar: true},
                    {width: 1, isBar: false},
                    {width: 2, isBar: true},
                    {width: 2, isBar: true}
                ]
              case 1:
                return [
                    {width: 2, isBar: true},
                    {width: 2, isBar: false},
                    {width: 1, isBar: true},
                    {width: 2, isBar: true},
                    {width: 1, isBar: false},
                    {width: 2, isBar: true}
                ]
              case 2:
                 return [
                  {width: 2, isBar: true},
                  {width: 2, isBar: false},
                  {width: 1, isBar: true},
                  {width: 2, isBar: true},
                  {width: 2, isBar: true},
                  {width: 1, isBar: false}
                ]
              case 3:
                   return [
                    {width: 2, isBar: true},
                    {width: 1, isBar: false},
                    {width: 2, isBar: true},
                    {width: 1, isBar: false},
                    {width: 2, isBar: true},
                    {width: 2, isBar: true}
                   ]
              case 4:
                return [
                    {width: 2, isBar: true},
                    {width: 1, isBar: false},
                    {width: 2, isBar: true},
                    {width: 2, isBar: true},
                    {width: 1, isBar: false},
                    {width: 2, isBar: true}
                   ]
              case 5:
                 return [
                     {width: 2, isBar: true},
                     {width: 1, isBar: false},
                     {width: 2, isBar: true},
                     {width: 2, isBar: true},
                     {width: 2, isBar: true},
                     {width: 1, isBar: false}
                 ]
             case 6:
               return [
                  {width: 2, isBar: true},
                   {width: 1, isBar: false},
                   {width: 1, isBar: true},
                   {width: 2, isBar: false},
                   {width: 2, isBar: true},
                   {width: 2, isBar: true}
                 ]
              case 7:
                return [
                  {width: 2, isBar: true},
                  {width: 1, isBar: false},
                  {width: 1, isBar: true},
                  {width: 2, isBar: true},
                  {width: 2, isBar: false},
                  {width: 2, isBar: true}
                ]
             case 8:
                return [
                 {width: 2, isBar: true},
                 {width: 1, isBar: false},
                 {width: 1, isBar: true},
                 {width: 2, isBar: true},
                 {width: 2, isBar: true},
                 {width: 2, isBar: false}
                ]
              case 9:
                 return [
                    {width: 1, isBar: false},
                   {width: 2, isBar: true},
                   {width: 2, isBar: false},
                    {width: 1, isBar: true},
                   {width: 2, isBar: true},
                   {width: 2, isBar: true}
                 ]
              default:
                 return [];
          }
      })
    return [...startCode,...codePattern.flat(),...stopCode];
  }
  
  export function generateSVGBarcode(modules: BarcodeModule[], height: number): JSX.Element {
    let x = 0;
    const rectElements: JSX.Element[] = [];

    modules.forEach((module, index) => {
        if (module.isBar) {
            rectElements.push(
              <rect
                key={index}
                x={x}
                y={0}
                width={module.width}
                height={height}
                fill="black"
              />
            );
        }
        x += module.width;
    });

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="auto"
        height={height}
      >
          {rectElements}
      </svg>
    );
  }
