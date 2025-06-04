import React from 'react';
import { Modal, Button, Table } from 'react-bootstrap';

function ReconciliationModal({ show, onHide, account, transactions = [], onReconcile }) {
    if (!account) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Reconcile Account</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-3">
                    <strong>Account:</strong> {account.accountName}
                </div>
                <Table size="sm" hover>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Reference</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-muted py-4">
                                    No transactions to reconcile
                                </td>
                            </tr>
                        ) : (
                            transactions.map(txn => (
                                <tr key={txn.id}>
                                    <td>{txn.transactionDate}</td>
                                    <td>{txn.description}</td>
                                    <td>{txn.reference}</td>
                                    <td>₹{txn.amount.toLocaleString('en-IN')}</td>
                                    <td>{txn.status}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
                <Button variant="primary" onClick={() => onReconcile({ account, transactions })}>
                    Reconcile
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ReconciliationModal;