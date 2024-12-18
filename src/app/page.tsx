'use client';
import React, { FC, useState, useEffect, ChangeEvent, useMemo } from 'react';
import { Button, Card, Flex, Form, Input, Switch } from 'antd';
import { QrcodeOutlined, BarcodeOutlined } from '@ant-design/icons';
import { QRCode as QRCodeGenerator } from '../qr-code/qr-code';
import { Barcode as BarcodeGenerator } from '@/barcode/barcode';
import { generateSVGBarcode } from '@/utils/utils-barcode';

type CodeType = 'streak' | 'qr';
type CodeGenerator = QRCodeGenerator | BarcodeGenerator;

export const Home: FC = () => {
  const [code, setCode] = useState<CodeType>('streak');
  const [message, setMessage] = useState<string>('');
  const [codeData, setCodeData] = useState<CodeGenerator | null>(null);

    const svg = useMemo(() => {
        if(!codeData)
        {
            return null;
        }

        if(codeData instanceof QRCodeGenerator)
        {
             return renderQrCode(codeData);
        }

        if(codeData instanceof BarcodeGenerator)
        {
            return renderBarcode(codeData)
        }
    }, [codeData])

  const generate = () => {
    if (code === 'qr') {
      const qr = new QRCodeGenerator(message);
      setCodeData(qr);
    } else {
      const barcode = new BarcodeGenerator(message);
      setCodeData(barcode);
    }
  };

  const changeMessage = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setMessage(e.target.value);
  };

  const changeCode = () => {
    setCode((prev) => (prev === 'qr' ? 'streak' : 'qr'));
  };

  useEffect(() => {
    setCode((prev) => (prev === 'qr' ? 'streak' : 'qr'));
  }, []);

  const renderQrCode = (qrCode: QRCodeGenerator) => {
    const size = 10;
    const qrMatrix = qrCode.init();
    const viewBoxSize = qrMatrix.length * size;

    const rects = qrMatrix.flatMap((row, rowIndex) =>
        Array.from(row).map((value, colIndex) => {
            if (value === 1) {
                return (
                    <rect
                        key={`${rowIndex}-${colIndex}`}
                        x={colIndex * size}
                        y={rowIndex * size}
                        width={size}
                        height={size}
                        fill="black"
                    />
                );
            }
            return null;
        })
    ).filter(Boolean) as JSX.Element[];

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            width="60%"
            height="60%"
            style={{ margin: 'auto' }}
        >
            {rects}
        </svg>
    );
  };

    const renderBarcode = (barcode: BarcodeGenerator) =>
    {
      const barcodePattern = barcode.init();
      const height = 100;
      return (
        generateSVGBarcode(barcodePattern, height)
      )
    };
  return (
    <>
      <Flex
        align="center"
        gap={8}
        vertical
        justify="center"
        style={{
          width: '30%',
          height: '50%',
          padding: '25px',
          border: '1px solid rgba(75,75,75, 0.3)',
          borderRadius: '10px'
        }}
      >
        <Switch
          checkedChildren={<QrcodeOutlined />}
          unCheckedChildren={<BarcodeOutlined />}
          defaultChecked
          onChange={changeCode}
        />
        <Button type="primary" onClick={generate}>
          Сгенерировать {code}
        </Button>
        <Form style={{ width: '100%' }}>
          <Input
            size="large"
            style={{ width: '100%' }}
            placeholder="Введите данные"
            onChange={(e) => changeMessage(e)}
          />
        </Form>
        <Card className="code" style={{ width: '100%', height: '100%' }}>
          {svg}
        </Card>
      </Flex>
    </>
  );
};

export default Home;