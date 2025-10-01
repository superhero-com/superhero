export default function ViewContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className="max-w-[min(1536px,100%)] mx-auto text-white px-4">
            {children}
        </div>
    );
}