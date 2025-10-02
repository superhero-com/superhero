import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import { useDaoVote } from "@/features/trendminer/hooks/useDaoVote";
import { useAeSdk } from "@/hooks";
import { Encoded } from "@aeternity/aepp-sdk";
import VoteSubject from "./VoteSubject";

interface VoteDetailProps {
  address: Encoded.ContractAddress;
  voteId: bigint;
  saleAddress: Encoded.ContractAddress;
}

export default function VoteDetail({
  address,
  voteId,
  saleAddress,
}: VoteDetailProps) {
  const { currentBlockHeight } = useAeSdk();
  const { voteState } = useDaoVote({
    tokenSaleAddress: saleAddress,
    voteAddress: address,
    voteId: voteId,
  });

  if (!voteState) {
    return <div className="text-slate-400">Loading vote details...</div>;
  }

  const isOpen = currentBlockHeight < voteState.close_height;

  const formatDate = (height: bigint) => {
    const timeDiff = (Number(height) - currentBlockHeight) * 3 * 60 * 1000;
    return new Date(Date.now() + timeDiff).toDateString();
  };

  return (
    <div className="border border-white/10 rounded-xl p-4 bg-black/20 backdrop-blur-lg text-white shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <VoteSubject voteState={voteState} />
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isOpen
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {isOpen ? "Open" : "Closed"}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {voteState?.metadata?.link && (
          <div className="pb-2 flex items-center gap-2">
            <strong className="item-label">Proposed By:</strong>
            <AddressAvatarWithChainNameFeed address={voteState.author} />
          </div>
        )}

        {voteState?.create_height && (
          <div className="pb-2">
            <strong className="item-label">Created At:</strong>
            {formatDate(voteState.create_height)}
          </div>
        )}

        {voteState?.close_height && (
          <div className="pb-2">
            <strong className="item-label">
              {isOpen ? "Open Until:" : "Expired At:"}
            </strong>
            {formatDate(voteState.close_height)}
          </div>
        )}

        {voteState?.metadata?.description && (
          <div className="pb-2">
            <div className="item-label">Description:</div>
            <div className="text-white/80 mt-1">
              {voteState.metadata.description}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          onClick={() => {
            // Navigate to vote details page
            window.location.href = `/trendminer/dao/${saleAddress}/vote/${voteId.toString()}/${address.toString()}`;
          }}
        >
          Open Vote Details
        </button>
      </div>
    </div>
  );
}
