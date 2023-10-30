import { useState, useEffect, useContext, useMemo } from "react";
import { nip19 } from "nostr-tools";
import {
  DeleteListing,
  NostrEvent,
  getLocalStorageData,
} from "../nostr-helpers";
import { ProductContext } from "../context";
import ProductCard, { TOTALPRODUCTCARDWIDTH } from "./product-card";
import DisplayProductModal from "./display-product-modal";
import { useRouter } from "next/router";
import parseTags, { ProductData } from "./utility/product-parser-functions";

const DisplayEvents = ({
  focusedPubkey,
  selectedCategories,
  selectedLocation,
  selectedSearch,
}: {
  focusedPubkey?: string;
  selectedCategories: Set<string>;
  selectedLocation: string;
  selectedSearch: string;
}) => {
  const [productEvents, setProductEvents] = useState<NostrEvent[]>([]);
  const [filteredProductData, setFilteredProductData] = useState<ProductData[]>(
    []
  );
  const [deletedProducts, setDeletedProducts] = useState<string[]>([]); // list of product ids that have been deleted
  const [isLoading, setIsLoading] = useState(true);
  const productEventContext = useContext(ProductContext);
  const [focusedProduct, setFocusedProduct] = useState(""); // product being viewed in modal
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!productEventContext) return;
    setIsLoading(productEventContext.isLoading);
    if (!productEventContext.isLoading && productEventContext.productEvents) {
      // is product sub reaches eose then we can sort the product data
      let sortedProductEvents = [
        ...productEventContext.productEvents.sort(
          (a, b) => b.created_at - a.created_at
        ),
      ]; // sorts most recently created to least recently created
      setProductEvents(sortedProductEvents);
      return;
    }
    setProductEvents(productEventContext.productEvents);
  }, [productEventContext]);

  /** FILTERS PRODUCT DATA ON CATEGORY, LOCATION, FOCUSED PUBKEY (SELLER) **/
  useEffect(() => {
    let filteredEvents = productEvents.filter((event) => {
      // gets rid of products that were deleted
      return !deletedProducts.includes(event.id);
    });
    let filteredProductData = filteredEvents.map((event) => {
      return parseTags(event);
    });

    if (productEvents && !isLoading && filteredProductData) {
      if (focusedPubkey) {
        filteredProductData = filteredProductData.filter(
          (productData: ProductData) => productData.pubkey === focusedPubkey
        );
      }
      filteredProductData = filteredProductData.filter(
        (productData: ProductData) => {
          if (!productData.categories) return false;
          return (
            selectedCategories.size === 0 ||
            Array.from(selectedCategories).some((selectedCategory) => {
              const re = new RegExp(selectedCategory, "gi");
              return productData.categories.some((category) => {
                const match = category.match(re);
                return match && match.length > 0;
              });
            })
          );
        }
      );
      filteredProductData = filteredProductData.filter(
        (productData: ProductData) => {
          return !selectedLocation || productData.location === selectedLocation;
        }
      );
      filteredProductData = filteredProductData.filter(
        (productData: ProductData) => {
          return (
            !selectedSearch ||
            [productData.title].some((title: string) => {
              const re = new RegExp(selectedSearch, "gi");
              const match = title.match(re);
              return match && match.length > 0;
            })
          );
        }
      );
    }
    setFilteredProductData(filteredProductData);
  }, [
    productEvents,
    isLoading,
    focusedPubkey,
    selectedCategories,
    selectedLocation,
    selectedSearch,
    deletedProducts,
  ]);

  const handleDelete = async (productId: string, passphrase: string) => {
    try {
      await DeleteListing([productId], passphrase);
      setDeletedProducts((deletedProducts) => [...deletedProducts, productId]);
    } catch (e) {
      console.log(e);
    }
  };

  const handleToggleModal = () => {
    setShowModal(!showModal);
  };

  const onProductClick = (product: any) => {
    setFocusedProduct(product);
    setShowModal(true);
  };

  const handleSendMessage = (pubkeyToOpenChatWith: string) => {
    let { signIn } = getLocalStorageData();
    if (!signIn) {
      alert("Please sign in to send a message");
      return;
    }
    setShowModal(false);
    router.push({
      pathname: "/direct-messages",
      query: { pk: nip19.npubEncode(pubkeyToOpenChatWith) },
    });
  };

  const handleCheckout = (productId: string) => {
    let { signIn } = getLocalStorageData();
    if (!signIn) {
      alert("Please sign in to send checkout");
      return;
    }
    setShowModal(false);
    router.push(`/checkout/${productId}`);
  };

  const getSpacerCardsNeeded = () => {
    const cardsOnEachRow = Math.floor(screen.width / TOTALPRODUCTCARDWIDTH);
    const spacerCardsNeeded =
      cardsOnEachRow - (filteredProductData.length % cardsOnEachRow);

    if (cardsOnEachRow == 1) return <></>; // no need for a spacer card cause each row is 1
    if (filteredProductData.length % cardsOnEachRow == 0) return <></>; // no need for a spacer card cause each row is filled up

    const spacerCards = [];
    let spacerCardWidth = "w-[385px] h-[300px]";
    for (let i = 0; i < spacerCardsNeeded; i++) {
      spacerCards.push(<div className={spacerCardWidth}></div>);
    }
    return spacerCards;
  };

  return (
    <>
      <div className="h-full">
        <div className="h-16">
          {/*spacer div needed to account for the header (Navbar and categories}*/}
        </div>
        {/* DISPLAYS PRODUCT LISTINGS HERE */}
        {filteredProductData.length != 0 ? (
          <div className="flex flex-row flex-wrap my-2 justify-evenly overflow-y-scroll overflow-x-hidden h-[90%] max-w-full">
            {filteredProductData.map((productData: ProductData, index) => {
              let npub = nip19.npubEncode(productData.pubkey);
              return (
                <ProductCard
                  key={productData.id + "-" + index}
                  productData={productData}
                  handleDelete={handleDelete}
                  onProductClick={onProductClick}
                />
              );
            })}
            {getSpacerCardsNeeded()}
          </div>
        ) : (
          <div className="mt-8 flex items-center justify-center">
            <p className="text-xl break-words text-center">
              No listings found . . .
            </p>
          </div>
        )}
        <div className="h-20">
          {/*spacer div needed to account for the footer buttons*/}
        </div>
      </div>
      <DisplayProductModal
        productData={focusedProduct}
        showModal={showModal}
        handleModalToggle={handleToggleModal}
        handleSendMessage={handleSendMessage}
        handleCheckout={handleCheckout}
      />
    </>
  );
};

export default DisplayEvents;
