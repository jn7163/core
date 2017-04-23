class Blockchain extends Observable {

    static getPersistent(accounts) {
        const store = BlockStore.getPersistent();
        return new Blockchain(store, accounts);
    }

    static createVolatile(accounts) {
        const store = BlockStore.createVolatile();
        return new Blockchain(store, accounts);
    }

    constructor(blockStore, accounts) {
        super();
        this._store = blockStore;
        this._accounts = accounts;

        this._chains = [new Chain(Block.GENESIS)];
        this._hardestChain = this._chains[0];
    }

    async pushBlock(block) {
        // determine from header timestamp, if header is a "current" header
          // if so, it is a candidate for the next chain head
          // else
            // continue catch-up phase
            // chain fork
            // orphan block
        let hardestChain = this._hardestChain;
        let found = false;

        // Append new block to all matching known chains.
        // Identify a new hardest chain in the process.
        for (let chain of this._chains) {
            if (block.isSuccessorOf(chain.head)) {
                chain.push(block);
                found = true;

                if (chain.totalWork > hardestHead.totalWork) {
                    hardestChain = chain;
                }

                // if(chain.totalWork === nextHead.totalWork)
                // 	// compare arrived timestamp
            }
        }

        // If the block does not extend any known chain, create a fork.
        if (!found) {
            await this._createFork(block);
            return;
        }

        // If we have found a new hardest chain, rebranch to the new chain.
        if (hardestChain !== this._hardestChain) {
            await this._rebranch(hardestChain);
            this.fire('change', this.head);
            return;
        }

        // We have extended the current hardest chain. Store the block.
        this._store.put(block);

        // Update the account state.
        // TODO handle failure case (remove block from chain?)
        await this.accounts.commitBlock(block)

        // Notify that we have a new head.
        this.fire('change', this.head);
    }

    async _createFork(block) {
        console.log('Forking BlockChain...');

        const prevTotalWork = this.totalWork - this.head.difficulty;	// Define here to prevent race condition
        const prevHead = await this._store.get(this.head.prevHash);

        if (block.isSuccessorOf(prevHead)) {
            // Put new block in block store.
            this._store.put(block);

            // Create a new chain.
            this._chains.push(new Chain(block, prevTotalWork + block.difficulty));
        } else {
            block.header.log('Invalid Block');
        }
    }

    async _rebranch(newHead) {
        console.log('Rebranching BlockChain...');
        throw 'BlockChain.rebranch() not implemented';

        // TODO store block

        /*
        let oldHead = this._hardestChain.head;
        let newBranch = [newHead];
        while (!oldHead.isSuccessorOf(newBranch[0])) {
            await this._p2pDB.accounts.revertBlock(oldHead);
            oldHead = await this._p2pDB.blocks.get(newBranch[0].header.prevHash);
            newBranch.unshift(oldHead);
        }

        for (let block of newBranch) {
            await this._p2pDB.accounts.commitBlock(block);
        }

        this._hardestChain = newHead;
        */
    }

    getBlock(hash) {
        return this._store.get(hash);
    }

    get head() {
        return this._hardestChain.head;
    }

    get totalWork() {
        return this._hardestChain.totalWork;
    }
}

class Chain {
    constructor(head, totalWork) {
        this._head = head;
        this._totalWork = totalWork ? totalWork : head.header.difficulty;
    }

    push(block) {
        if (block.successorOf(this._head)) {
            this._head = block;
            this._totalWork += block.difficulty;
        }
        return this._totalWork;
    }

    get head() {
        return this._head;
    }

    get totalWork() {
        return this._totalWork;
    }
}
