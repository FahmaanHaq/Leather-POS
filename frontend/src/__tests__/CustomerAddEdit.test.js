import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddEdit from '../modules/Customers/Pages/AddEdit';
import * as CustomerServices from '../modules/Customers/Services';
import * as tokenDecoder from '../common/tokenDecoder';

jest.mock('../modules/Customers/Services');
jest.mock('../common/tokenDecoder');

describe('Customers AddEdit form', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        tokenDecoder.getUserIDFromToken.mockReturnValue(1);
    });

    test('requires a name before submitting', async () => {
        render(<AddEdit customer={null} groupId={1} onClose={jest.fn()} onSaved={jest.fn()} />);

        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
        expect(CustomerServices.saveCustomer).not.toHaveBeenCalled();
    });

    test('rejects a credit limit on a walk-in customer', async () => {
        render(<AddEdit customer={null} groupId={1} onClose={jest.fn()} onSaved={jest.fn()} />);

        await userEvent.type(screen.getByLabelText(/^name/i), 'Walk-in Guy');
        await userEvent.click(screen.getByLabelText(/customer type/i));
        await userEvent.click(await screen.findByRole('option', { name: /walk-in/i }));

        // Credit limit / days fields should not even render for walk-in customers
        expect(screen.queryByLabelText(/credit limit/i)).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(CustomerServices.saveCustomer).toHaveBeenCalledWith(
                expect.objectContaining({ customerType: 2, creditLimit: null, creditDays: null })
            );
        });
    });

    test('allows a regular customer to be saved with credit terms', async () => {
        CustomerServices.saveCustomer.mockResolvedValue({ status: true, data: 42 });
        const onSaved = jest.fn();

        render(<AddEdit customer={null} groupId={1} onClose={jest.fn()} onSaved={onSaved} />);

        await userEvent.type(screen.getByLabelText(/^name/i), 'Regular Co');
        await userEvent.type(screen.getByLabelText(/credit limit/i), '50000');
        await userEvent.type(screen.getByLabelText(/credit days/i), '30');

        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(CustomerServices.saveCustomer).toHaveBeenCalledWith(
            expect.objectContaining({ customerType: 1, creditLimit: 50000, creditDays: 30 })
        );
    });

    test('rejects a negative credit limit', async () => {
        render(<AddEdit customer={null} groupId={1} onClose={jest.fn()} onSaved={jest.fn()} />);

        await userEvent.type(screen.getByLabelText(/^name/i), 'Regular Co');
        await userEvent.type(screen.getByLabelText(/credit limit/i), '-100');
        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        expect(await screen.findByText(/cannot be negative/i)).toBeInTheDocument();
        expect(CustomerServices.saveCustomer).not.toHaveBeenCalled();
    });

    test('shows the server error message when save fails', async () => {
        CustomerServices.saveCustomer.mockResolvedValue({
            status: false,
            message: 'A customer with this phone number already exists in this group',
        });

        render(<AddEdit customer={null} groupId={1} onClose={jest.fn()} onSaved={jest.fn()} />);

        await userEvent.type(screen.getByLabelText(/^name/i), 'Duplicate Phone Co');
        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        expect(await screen.findByText(/already exists in this group/i)).toBeInTheDocument();
    });
});
