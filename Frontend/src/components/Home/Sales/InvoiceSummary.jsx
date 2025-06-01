import React from 'react';
import { Card, Form } from 'react-bootstrap';

function InvoiceSummary({
    summaryValues,
    formData,
    onDiscountChange,
    discountRef,
    onKeyDown
}) {
    return (
        <Card className="bg-light border-0 shadow-sm">
            <Card.Body>
                <h6 className="fw-bold mb-3 text-center">Invoice Summary</h6>

                {/* Subtotal */}
                <div className="d-flex justify-content-between mb-2">
                    <span>
                        {formData.invoiceType === 'gst' ? 'Base Amount:' : 'Subtotal:'}
                        {formData.invoiceType === 'gst' && (
                            <small className="text-muted d-block">
                                (Tax Exclusive base)
                            </small>
                        )}
                    </span>
                    <span>₹{summaryValues.subtotal.toFixed(2)}</span>
                </div>

                {/* Discount */}
                <div className="d-flex justify-content-between mb-2">
                    <span>Discount:</span>
                    <div className="d-flex align-items-center">
                        <Form.Control
                            ref={discountRef}
                            type="number"
                            name="discount"
                            value={formData.discount || 0}
                            onChange={onDiscountChange}
                            onKeyDown={onKeyDown}
                            style={{ width: '70px' }}
                            className="form-input me-2"
                            min="0"
                            max="100"
                            step="0.1"
                            aria-label="Discount percentage"
                        />
                        <span>%</span>
                    </div>
                </div>

                {summaryValues.discountPercent > 0 && (
                    <div className="d-flex justify-content-between mb-2 text-danger">
                        <span>Discount Amount:</span>
                        <span>-₹{summaryValues.discountAmount.toFixed(2)}</span>
                    </div>
                )}

                {summaryValues.discountPercent > 0 && (
                    <div className="d-flex justify-content-between mb-2">
                        <span>After Discount:</span>
                        <span>₹{summaryValues.subtotalAfterDiscount.toFixed(2)}</span>
                    </div>
                )}

                {/* GST */}
                {formData.invoiceType === 'gst' && summaryValues.gstAmount > 0 && (
                    <div className="d-flex justify-content-between mb-2 text-info">
                        <span>
                            GST Amount:
                            <small className="text-muted d-block">
                                (Calculated per item rates)
                            </small>
                        </span>
                        <span>₹{summaryValues.gstAmount.toFixed(2)}</span>
                    </div>
                )}

                <hr className="my-3" />

                {/* Final Total */}
                <div className="d-flex justify-content-between fw-bold mb-3">
                    <span className="text-lg">Total Amount:</span>
                    <span className="text-primary text-lg">₹{summaryValues.finalTotal.toFixed(2)}</span>
                </div>

                {/* Tax Summary for GST Invoices */}
                {formData.invoiceType === 'gst' && formData.items?.length > 0 && (
                    <>
                        <hr className="my-2" />
                        <div className="small text-muted">
                            <div className="fw-semibold mb-1">Tax Breakdown:</div>
                            {formData.items
                                .filter(item => item.productService && item.gstRate > 0)
                                .reduce((acc, item) => {
                                    const rate = item.gstRate;
                                    const existing = acc.find(g => g.rate === rate);
                                    const quantity = parseFloat(item.quantity) || 0;
                                    const price = parseFloat(item.price) || 0;
                                    const itemTotal = quantity * price;

                                    let gstAmount = 0;
                                    if (item.taxInclusive) {
                                        gstAmount = itemTotal - (itemTotal / (1 + rate / 100));
                                    } else {
                                        gstAmount = (itemTotal * rate) / 100;
                                    }

                                    const discountPercent = parseFloat(formData.discount) || 0;
                                    gstAmount = gstAmount - (gstAmount * discountPercent) / 100;

                                    if (existing) {
                                        existing.amount += gstAmount;
                                    } else {
                                        acc.push({ rate, amount: gstAmount });
                                    }
                                    return acc;
                                }, [])
                                .map(gst => (
                                    <div key={gst.rate} className="d-flex justify-content-between">
                                        <span>GST {gst.rate}%:</span>
                                        <span>₹{gst.amount.toFixed(2)}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </>
                )}
            </Card.Body>
        </Card>
    );
}

export default InvoiceSummary;