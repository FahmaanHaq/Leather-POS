import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddEdit from '../modules/Items/Pages/AddEdit';
import * as ItemServices from '../modules/Items/Services';
import * as tokenDecoder from '../common/tokenDecoder';

jest.mock('../modules/Items/Services');
jest.mock('../common/tokenDecoder');

const uomList = [
    { uomid: 1, uomcode: 'm', uomname: 'Metre' },
    { uomid: 2, uomcode: 'pcs', uomname: 'Piece' },
];

describe('Items AddEdit form', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        tokenDecoder.getUserIDFromToken.mockReturnValue(1);
    });

    test('requires item code, item name, and a UOM selection', async () => {
        render(<AddEdit item={null} groupId={1} uomList={[]} onClose={jest.fn()} onSaved={jest.fn()} />);

        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        expect(await screen.findByText(/item code is required/i)).toBeInTheDocument();
        expect(screen.getByText(/item name is required/i)).toBeInTheDocument();
        expect(ItemServices.saveItem).not.toHaveBeenCalled();
    });

    test('rejects a selling price with more than 2 decimal places', async () => {
        render(<AddEdit item={null} groupId={1} uomList={uomList} onClose={jest.fn()} onSaved={jest.fn()} />);

        await userEvent.type(screen.getByLabelText(/item code/i), 'HIDE-001');
        await userEvent.type(screen.getByLabelText(/item name/i), 'Cow Hide Full');
        await userEvent.type(screen.getByLabelText(/cost price/i), '1000');
        await userEvent.type(screen.getByLabelText(/selling price/i), '1500.999');

        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        expect(await screen.findByText(/up to 2 decimal places/i)).toBeInTheDocument();
        expect(ItemServices.saveItem).not.toHaveBeenCalled();
    });

    test('accepts a fractional reorder level with up to 3 decimal places', async () => {
        ItemServices.saveItem.mockResolvedValue({ status: true, data: 10 });
        const onSaved = jest.fn();

        render(<AddEdit item={null} groupId={1} uomList={uomList} onClose={jest.fn()} onSaved={onSaved} />);

        await userEvent.type(screen.getByLabelText(/item code/i), 'HIDE-002');
        await userEvent.type(screen.getByLabelText(/item name/i), 'Cow Hide Half');
        await userEvent.type(screen.getByLabelText(/cost price/i), '500');
        await userEvent.type(screen.getByLabelText(/selling price/i), '750');
        await userEvent.clear(screen.getByLabelText(/reorder level/i));
        await userEvent.type(screen.getByLabelText(/reorder level/i), '2.500');

        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(ItemServices.saveItem).toHaveBeenCalledWith(
            expect.objectContaining({ itemCode: 'HIDE-002', reorderLevel: '2.500' })
        );
    });

    test('shows the server duplicate-code error returned from the API', async () => {
        ItemServices.saveItem.mockResolvedValue({
            status: false,
            message: 'An item with this code already exists in this group',
        });

        render(<AddEdit item={null} groupId={1} uomList={uomList} onClose={jest.fn()} onSaved={jest.fn()} />);

        await userEvent.type(screen.getByLabelText(/item code/i), 'HIDE-001');
        await userEvent.type(screen.getByLabelText(/item name/i), 'Duplicate Hide');
        await userEvent.type(screen.getByLabelText(/cost price/i), '1000');
        await userEvent.type(screen.getByLabelText(/selling price/i), '1500');

        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        expect(await screen.findByText(/already exists in this group/i)).toBeInTheDocument();
    });
});
