import React from 'react';
import { type RetailSale } from '../types';
import { Badge } from './ui';

interface ReceiptCardProps {
    sale: RetailSale;
    farmName?: string;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({ sale, farmName = "LIFE-LINE POULTRY" }) => {
    const formattedDate = new Date(sale.createdAt).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    return (
        <div id="printable-receipt" className="max-w-[400px] mx-auto bg-white text-zinc-900 p-8 sm:p-10 rounded-[32px] shadow-2xl border border-zinc-100 flex flex-col gap-8 print:shadow-none print:border-none print:p-0 print:max-w-full">
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black tracking-tighter uppercase italic">{farmName}</h2>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Official Sales Receipt</span>
                    <Badge variant="outline" className="text-[9px] border-zinc-200 text-zinc-500">{sale.receiptNumber}</Badge>
                </div>
            </div>

            {/* Metadata */}
            <div className="flex justify-between items-end border-b border-zinc-100 pb-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <div className="flex flex-col gap-1">
                    <span>Date</span>
                    <span className="text-zinc-900">{formattedDate}</span>
                </div>
                <div className="text-right flex flex-col gap-1">
                    <span>Customer</span>
                    <span className="text-zinc-900">{sale.customerName || 'Direct Client'}</span>
                </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
                {sale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-zinc-800 uppercase tracking-tight">{item.name}</p>
                            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                                {item.quantity} × ₦{item.unitPrice.toLocaleString()}
                            </p>
                        </div>
                        <span className="text-sm font-black tabular-nums tracking-tighter">
                            ₦{item.total.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-6 border-t-2 border-dashed border-zinc-100 space-y-3">
                <div className="flex justify-between items-center text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="text-zinc-900 tabular-nums">₦{sale.totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl">
                    <span className="text-xs font-black uppercase tracking-widest">Grand Total</span>
                    <span className="text-2xl font-black tracking-tighter tabular-nums drop-shadow-sm">
                        ₦{sale.totalPrice.toLocaleString()}
                    </span>
                </div>
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest text-center pt-2">
                    Paid via {sale.paymentMethod.toUpperCase()}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center space-y-4 pt-4">
                <div className="flex justify-center gap-1 opacity-20">
                    {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />)}
                </div>
                <p className="text-[11px] font-bold text-zinc-400 tracking-widest uppercase italic">
                    Thank you for your purchase
                </p>
                <div className="text-[8px] font-medium text-zinc-300 uppercase tracking-[0.3em]">
                    Powered by Life-Line POS
                </div>
            </div>

            {/* Custom Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden; }
                    #printable-receipt, #printable-receipt * { visibility: visible; }
                    #printable-receipt {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 20px !important;
                        margin: 0 !important;
                    }
                    .no-print { display: none !important; }
                }
            `}} />
        </div>
    );
};
