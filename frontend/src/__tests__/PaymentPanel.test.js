import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentPanel from '../modules/Billing/Pages/PaymentPanel';

describe('Billing PaymentPanel', () => {
    test('rejects submission when payments do not sum to the total', async () => {
        const onSubmit = jest.fn();
        render(<PaymentPanel totalAmount={1000} customer={null} onClose={jest.fn()} onSubmit={onSubmit} />);

        // Default single Cash row is pre-filled with the full total, so first
        // reduce it to create a mismatch.
        const amountInput = screen.getAllByLabelText(/amount/i)[0];
        await userEvent.clear(amountInput);
        await userEvent.type(amountInput, '500');

        await userEvent.click(screen.getByRole('button', { name: /complete sale/i }));

        expect(await screen.findByText(/must add up to the total/i)).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    test('submits successfully when a single cash payment matches the total exactly', async () => {
        const onSubmit = jest.fn().mockResolvedValue({ status: true });
        render(<PaymentPanel totalAmount={1000} customer={null} onClose={jest.fn()} onSubmit={onSubmit} />);

        // Default row is pre-filled with the full total already
        await userEvent.click(screen.getByRole('button', { name: /complete sale/i }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        const payload = onSubmit.mock.calls[0][0];
        expect(payload).toHaveLength(1);
        expect(payload[0]).toEqual(expect.objectContaining({ paymentMode: 1, amount: 1000 }));
    });

    test('disables Credit option for a walk-in customer', () => {
        const walkIn = { customerID: 1, customerType: 2, name: 'Walk-in Guy' };
        render(<PaymentPanel totalAmount={1000} customer={walkIn} onClose={jest.fn()} onSubmit={jest.fn()} />);

        expect(screen.getByText(/only available for Regular customers/i)).toBeInTheDocument();
    });

    test('enables Credit option for a Regular customer', () => {
        const regular = { customerID: 1, customerType: 1, name: 'Regular Co' };
        render(<PaymentPanel totalAmount={1000} customer={regular} onClose={jest.fn()} onSubmit={jest.fn()} />);

        expect(screen.queryByText(/only available for Regular customers/i)).not.toBeInTheDocument();
    });

    test('splitting payment across cash and card rows that sum to the total succeeds', async () => {
        const onSubmit = jest.fn().mockResolvedValue({ status: true });
        render(<PaymentPanel totalAmount={1000} customer={null} onClose={jest.fn()} onSubmit={onSubmit} />);

        // Reduce the default cash row to 600
        const firstAmount = screen.getAllByLabelText(/amount/i)[0];
        await userEvent.clear(firstAmount);
        await userEvent.type(firstAmount, '600');

        // Add a Card row for the remaining 400
        await userEvent.click(screen.getByRole('button', { name: '+ Card' }));
        const amounts = screen.getAllByLabelText(/amount/i);
        await userEvent.clear(amounts[1]);
        await userEvent.type(amounts[1], '400');

        await userEvent.click(screen.getByRole('button', { name: /complete sale/i }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        const payload = onSubmit.mock.calls[0][0];
        expect(payload).toHaveLength(2);
        expect(payload.reduce((sum, p) => sum + p.amount, 0)).toBe(1000);
    });
});
