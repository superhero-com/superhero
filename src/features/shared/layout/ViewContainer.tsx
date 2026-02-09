const ViewContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-[min(1536px,100%)] mx-auto text-white px-4">
    {children}
  </div>
);

export default ViewContainer;
